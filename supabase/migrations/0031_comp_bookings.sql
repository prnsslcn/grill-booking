-- 0031_comp_bookings.sql
-- 무상(지인) 예약 지원. 슬롯은 점유(중복 예약 차단)하되 매출·정산에는 잡히지 않는 예약.
--   · source='comp' 로 저장 → 실매출(payments 기반)과 유선 매출 요약(source='offline'만 합산)에서 자동 제외.
--   · 금액은 0원으로 기록. 기존 bookings.amount CHECK(>0)가 0을 막으므로 >=0으로 완화.
-- admin_create_booking 에 p_source 파라미터 추가(기본 'offline'), comp면 금액을 0으로 강제.
-- admin_cancel_offline_booking 은 comp도 취소 가능하도록 확장.

-- 1) amount CHECK 완화: > 0 → >= 0 (무상 0원 허용)
alter table public.bookings drop constraint if exists bookings_amount_check;
alter table public.bookings add constraint bookings_amount_check check (amount >= 0);

-- 2) admin_create_booking 재정의(+ p_source)
drop function if exists public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int);

create or replace function public.admin_create_booking(
  p_facility_type text,
  p_date          date,
  p_part          smallint,
  p_guest_name    text,
  p_guest_phone   text,
  p_guest_count   int,
  p_meat          text default 'pork',
  p_note          text default null,
  p_addons        jsonb default '{}'::jsonb,
  p_amount        int default null,
  p_source        text default 'offline'
)
returns table (booking_id uuid, booking_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facility    public.facilities%rowtype;
  v_slot        public.slots%rowtype;
  v_unit        public.facility_units%rowtype;
  v_amount      int;
  v_addon_total int := 0;
  v_addon_list  jsonb := '[]'::jsonb;
  v_key         text;
  v_qtytext     text;
  v_qty         int;
  v_addon       public.addons%rowtype;
  v_snapshot    jsonb;
  v_number      text;
  v_is_comp     boolean := (p_source = 'comp');
begin
  if p_source not in ('offline', 'comp') then raise exception 'INVALID_SOURCE'; end if;
  if p_meat not in ('pork', 'beef') then raise exception 'INVALID_MEAT'; end if;
  if p_part not in (1, 2) then raise exception 'INVALID_PART'; end if;
  if coalesce(btrim(p_guest_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_facility from public.facilities where type = p_facility_type and is_active = true;
  if not found then raise exception 'FACILITY_NOT_FOUND'; end if;

  perform public.generate_slots(p_date, p_date);

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

  if not found then raise exception 'NO_UNIT_AVAILABLE'; end if;

  select * into v_unit from public.facility_units where id = v_slot.facility_unit_id;

  -- 추가메뉴 목록 스냅샷(무상이어도 구성 참고용으로 기록). 금액 합산은 유상일 때만 반영.
  if p_addons is not null then
    for v_key, v_qtytext in select * from jsonb_each_text(p_addons) loop
      v_qty := v_qtytext::int;
      if v_qty > 0 then
        select * into v_addon from public.addons where key = v_key and is_active = true;
        if not found then raise exception 'INVALID_ADDON'; end if;
        v_addon_total := v_addon_total + v_addon.price * v_qty;
        v_addon_list := v_addon_list || jsonb_build_object(
          'key', v_addon.key, 'label', v_addon.label, 'price', v_addon.price, 'qty', v_qty
        );
      end if;
    end loop;
  end if;

  -- 금액: 무상(comp)이면 0원 강제, 유상이면 (p_amount 또는 시설가) + 추가메뉴 합산
  if v_is_comp then
    v_amount := 0;
  else
    if p_amount is not null then
      v_amount := p_amount;
    else
      v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;
    end if;
    v_amount := coalesce(v_amount, 0) + v_addon_total;
  end if;

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_slot.date,
    'part',          v_slot.part,
    'meat',          p_meat,
    'capacity',      v_facility.capacity,
    'addons',        v_addon_list,
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
    v_snapshot, v_amount, 'confirmed', p_source
  )
  returning id into booking_id;

  update public.slots set status = 'booked' where id = v_slot.id;

  booking_number := v_number;
  return next;
end;
$$;

revoke all on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int, text) from public;
grant execute on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int, text) to service_role;

-- 3) 무상/유선 취소: source in ('offline','comp') 허용
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
  if v_booking.source not in ('offline', 'comp') then raise exception 'NOT_OFFLINE'; end if;

  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.slots set status = 'open' where id = v_booking.slot_id and status = 'booked';
end;
$$;
