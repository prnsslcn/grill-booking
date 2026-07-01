-- 0025_offline_bookings.sql
-- 유선(오프라인) 예약을 관리자가 직접 등록. 온라인과 동일하게 슬롯을 점유해
-- 온라인 가용성에서 자동 제외(기존 UNIQUE·booked 로직 재사용).

-- 예약 출처 구분: 'online'(결제 예약) | 'offline'(유선/현장, 결제 없음)
alter table public.bookings
  add column if not exists source text not null default 'online';

-- ── 오프라인 예약 생성 ──────────────────────────────────────────────
-- (시설종류, 날짜, 부)의 남은 open 슬롯 하나를 선점해 confirmed offline 예약 생성.
-- 결제 없음(payments 미생성), amount는 시설 고기세트가로 기록. 슬롯은 booked.
create or replace function public.admin_create_booking(
  p_facility_type text,
  p_date          date,
  p_part          smallint,
  p_guest_name    text,
  p_guest_phone   text,
  p_guest_count   int,
  p_meat          text default 'pork',
  p_note          text default null
)
returns table (booking_id uuid, booking_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facility public.facilities%rowtype;
  v_slot     public.slots%rowtype;
  v_unit     public.facility_units%rowtype;
  v_amount   int;
  v_snapshot jsonb;
  v_number   text;
begin
  if p_meat not in ('pork', 'beef') then raise exception 'INVALID_MEAT'; end if;
  if p_part not in (1, 2) then raise exception 'INVALID_PART'; end if;
  if coalesce(btrim(p_guest_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;

  select * into v_facility from public.facilities where type = p_facility_type and is_active = true;
  if not found then raise exception 'FACILITY_NOT_FOUND'; end if;

  -- 운영일이면 슬롯 멱등 생성(아직 아무도 조회 안 한 날짜 대비). 운영일 아니면 생성 0건.
  perform public.generate_slots(p_date, p_date);

  -- 남은 open 슬롯 하나 선점(동시성: skip locked)
  select s.* into v_slot
  from public.slots s
  join public.facility_units fu on fu.id = s.facility_unit_id
  where fu.facility_id = v_facility.id
    and s.date = p_date
    and s.part = p_part
    and s.status = 'open'
  order by fu.unit_label
  limit 1
  for update skip locked;

  if not found then
    raise exception 'NO_UNIT_AVAILABLE'; -- 운영일 아님 또는 잔여 동 없음
  end if;

  select * into v_unit from public.facility_units where id = v_slot.facility_unit_id;

  v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_slot.date,
    'part',          v_slot.part,
    'meat',          p_meat,
    'capacity',      v_facility.capacity,
    'addons',        '[]'::jsonb,
    'note',          p_note
  );

  v_number := 'R-' || to_char(p_date, 'YYYYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.bookings (
    booking_number, slot_id, guest_name, guest_phone, guest_count,
    facility_snapshot, amount, status, source
  )
  values (
    v_number, v_slot.id, p_guest_name, p_guest_phone, coalesce(p_guest_count, 1),
    v_snapshot, coalesce(v_amount, 0), 'confirmed', 'offline'
  )
  returning id into booking_id;

  update public.slots set status = 'booked' where id = v_slot.id;

  booking_number := v_number;
  return next;
end;
$$;

-- ── 오프라인 예약 취소(오등록 정정) ──────────────────────────────────
-- offline 예약만: 취소 처리 + 슬롯 open 복구(결제 없으므로 토스 미호출).
create or replace function public.admin_cancel_offline_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.source <> 'offline' then raise exception 'NOT_OFFLINE'; end if;

  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.slots set status = 'open' where id = v_booking.slot_id and status = 'booked';
end;
$$;

revoke all on function public.admin_create_booking(text, date, smallint, text, text, int, text, text) from public;
grant execute on function public.admin_create_booking(text, date, smallint, text, text, int, text, text) to service_role;
revoke all on function public.admin_cancel_offline_booking(uuid) from public;
grant execute on function public.admin_cancel_offline_booking(uuid) to service_role;
