-- 0010_booking_functions.sql
-- 슬롯 선점·슬롯 생성·만료 회수 로직을 Postgres 함수로 구현.
-- 모두 security definer + service_role 전용(GRANT). 고객 흐름은 서버 라우트(admin 클라이언트)만 호출.

-- ── pending_payment 타임아웃 단일 출처 ──────────────────────────────────────
-- 미정값(기본 10분)을 한 곳에서 관리. reserve_slot·expire_pending_bookings가 공유.
create or replace function public.pending_payment_timeout()
returns interval
language sql
immutable
as $$
  select interval '10 minutes';
$$;

-- ── 슬롯 선점 → pending_payment 예약 생성 (단일 트랜잭션) ─────────────────────
create or replace function public.reserve_slot(
  p_slot_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_count int default 1
)
returns table (
  booking_id uuid,
  booking_number text,
  order_id text,
  amount int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot     public.slots%rowtype;
  v_unit     public.facility_units%rowtype;
  v_facility public.facilities%rowtype;
  v_active   public.bookings%rowtype;
  v_amount   int;
  v_snapshot jsonb;
  v_number   text;
begin
  -- 1) 대상 슬롯 잠금(FOR UPDATE). 동시 요청을 직렬화.
  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;

  -- 2) 상태 처리 + 지연 회수
  if v_slot.status = 'closed' then
    raise exception 'SLOT_CLOSED';
  end if;

  if v_slot.status = 'booked' then
    select * into v_active
    from public.bookings
    where slot_id = p_slot_id
      and status in ('pending_payment', 'confirmed', 'cancel_requested')
    limit 1;

    if found then
      if v_active.status = 'pending_payment'
         and v_active.created_at < now() - public.pending_payment_timeout() then
        -- 만료된 미결제 예약 → 회수(취소). 부분 유니크에서 빠져 재예약 가능해짐.
        update public.bookings set status = 'cancelled' where id = v_active.id;
      else
        raise exception 'SLOT_TAKEN';
      end if;
    end if;
  end if;

  -- 3) 가격·스냅샷 (서버 권위 가격: facilities.price)
  select * into v_unit from public.facility_units where id = v_slot.facility_unit_id;
  select * into v_facility from public.facilities where id = v_unit.facility_id;

  v_amount := v_facility.price;
  if v_amount is null or v_amount <= 0 then
    raise exception 'PRICE_NOT_SET';
  end if;

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_slot.date,
    'part',          v_slot.part
  );

  -- 4) 예약번호/주문ID (예: R-20260605-A3F9C1)
  v_number := 'R-' || to_char(v_slot.date, 'YYYYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  -- 5) 예약 생성. 부분 유니크(bookings_active_slot_unique)가 동시성 최종 백스톱.
  begin
    insert into public.bookings (
      booking_number, slot_id, guest_name, guest_phone, guest_count,
      facility_snapshot, amount, status
    )
    values (
      v_number, p_slot_id, p_guest_name, p_guest_phone, coalesce(p_guest_count, 1),
      v_snapshot, v_amount, 'pending_payment'
    )
    returning id into booking_id;
  exception when unique_violation then
    raise exception 'SLOT_TAKEN';
  end;

  -- 6) 슬롯 상태 변경
  update public.slots set status = 'booked' where id = p_slot_id;

  booking_number := v_number;
  order_id       := v_number;
  amount         := v_amount;
  return next;
end;
$$;

-- ── 운영일(금·토) 슬롯 멱등 생성 ────────────────────────────────────────────
create or replace function public.generate_slots(p_from date, p_to date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.slots (facility_unit_id, date, part, status)
  select fu.id, d::date, parts.p, 'open'
  from public.facility_units fu
  cross join generate_series(p_from, p_to, interval '1 day') as d
  cross join (values (1), (2)) as parts(p)
  where fu.is_active = true
    and extract(dow from d) in (5, 6)  -- 금(5)·토(6)
  on conflict (facility_unit_id, date, part) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── 만료 pending 예약 일괄 회수(스윕) ───────────────────────────────────────
create or replace function public.expire_pending_bookings(
  p_timeout interval default public.pending_payment_timeout()
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- 만료 예약이 점유한 슬롯 먼저 open 복구(아직 pending인 상태에서)
  update public.slots s set status = 'open'
  from public.bookings b
  where b.slot_id = s.id
    and b.status = 'pending_payment'
    and b.created_at < now() - p_timeout
    and s.status = 'booked';

  -- 만료 예약 취소
  update public.bookings set status = 'cancelled'
  where status = 'pending_payment'
    and created_at < now() - p_timeout;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── 권한: service_role 전용 ─────────────────────────────────────────────────
revoke all on function public.pending_payment_timeout() from public;
revoke all on function public.reserve_slot(uuid, text, text, int) from public;
revoke all on function public.generate_slots(date, date) from public;
revoke all on function public.expire_pending_bookings(interval) from public;

grant execute on function public.reserve_slot(uuid, text, text, int) to service_role;
grant execute on function public.generate_slots(date, date) to service_role;
grant execute on function public.expire_pending_bookings(interval) to service_role;
