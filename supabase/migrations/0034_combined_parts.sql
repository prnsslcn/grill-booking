-- 0034_combined_parts.sql
-- 유선 예약 '1·2부 통합': 한 시설(동)을 1부·2부 두 타임 모두 점유(연장 이용).
--   · 두 슬롯을 동시에 잠그고 booked 처리 → 중복 예약 원천 차단.
--   · booking 은 1부 슬롯에 생성, 2부 슬롯은 booked(예약행 없음)로 홀드. 취소 시 둘 다 open 복구.
--   · '시설 이용 추가 금액'(p_facility_fee)은 extras=[{시설 이용 추가, 금액}]로 기록되어 월말보고에 반영.
-- admin_create_booking 에 p_combined·p_facility_fee 추가. admin_cancel_offline_booking 은 통합 시 형제 슬롯도 복구.

drop function if exists public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int, text);

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
  p_source        text default 'offline',
  p_combined      boolean default false,
  p_facility_fee  int default 0
)
returns table (booking_id uuid, booking_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facility    public.facilities%rowtype;
  v_slot_id     uuid;
  v_slot2_id    uuid := null;
  v_unit_label  text;
  v_snap_part   smallint;
  v_amount      int;
  v_addon_total int := 0;
  v_addon_list  jsonb := '[]'::jsonb;
  v_extras      jsonb := '[]'::jsonb;
  v_key         text;
  v_qtytext     text;
  v_qty         int;
  v_addon       public.addons%rowtype;
  v_snapshot    jsonb;
  v_number      text;
  v_is_comp     boolean := (p_source = 'comp');
  v_fee         int := coalesce(p_facility_fee, 0);
begin
  if p_source not in ('offline', 'comp') then raise exception 'INVALID_SOURCE'; end if;
  if p_meat not in ('pork', 'beef') then raise exception 'INVALID_MEAT'; end if;
  if p_part not in (1, 2) then raise exception 'INVALID_PART'; end if;
  if coalesce(btrim(p_guest_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;
  if v_fee < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_facility from public.facilities where type = p_facility_type and is_active = true;
  if not found then raise exception 'FACILITY_NOT_FOUND'; end if;

  perform public.generate_slots(p_date, p_date);

  if p_combined then
    -- 1부·2부가 모두 open 인 동을 찾아 두 슬롯을 함께 잠근다.
    select s1.id, s2.id, fu.unit_label
      into v_slot_id, v_slot2_id, v_unit_label
      from public.facility_units fu
      join public.slots s1 on s1.facility_unit_id = fu.id and s1.date = p_date and s1.part = 1 and s1.status = 'open'
      join public.slots s2 on s2.facility_unit_id = fu.id and s2.date = p_date and s2.part = 2 and s2.status = 'open'
      where fu.facility_id = v_facility.id
      order by fu.unit_label
      limit 1
      for update of s1, s2 skip locked;
    if v_slot_id is null then raise exception 'NO_UNIT_AVAILABLE'; end if;
    v_snap_part := 1;
  else
    select s.id, fu.unit_label
      into v_slot_id, v_unit_label
      from public.slots s
      join public.facility_units fu on fu.id = s.facility_unit_id
      where fu.facility_id = v_facility.id
        and s.date = p_date
        and s.part = p_part
        and s.status = 'open'
      order by fu.unit_label
      limit 1
      for update of s skip locked;
    if v_slot_id is null then raise exception 'NO_UNIT_AVAILABLE'; end if;
    v_snap_part := p_part;
  end if;

  -- 추가메뉴 목록/합계(스냅샷용). 무상이어도 목록은 기록.
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

  -- 시설 이용 추가 금액(통합 이용) → extras
  if p_combined and v_fee > 0 and not v_is_comp then
    v_extras := jsonb_build_array(jsonb_build_object('label', '시설 이용 추가', 'amount', v_fee));
  end if;

  -- 금액: 무상 0원, 그 외 (p_amount 또는 시설가) + 추가메뉴 + 시설이용추가
  if v_is_comp then
    v_amount := 0;
  else
    if p_amount is not null then
      v_amount := p_amount;
    else
      v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;
    end if;
    v_amount := coalesce(v_amount, 0) + v_addon_total + (case when p_combined then v_fee else 0 end);
  end if;

  v_snapshot := jsonb_build_object(
    'facility_type',     v_facility.type,
    'facility_name',     v_facility.name,
    'unit_label',        v_unit_label,
    'date',              p_date,
    'part',              v_snap_part,
    'meat',              p_meat,
    'capacity',          v_facility.capacity,
    'addons',            v_addon_list,
    'extras',            v_extras,
    'note',              p_note,
    'combined',          p_combined,
    'combined_slot_id',  v_slot2_id
  );

  v_number := 'R-' || to_char(p_date, 'YYYYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.bookings (
    booking_number, slot_id, guest_name, guest_phone, guest_count,
    facility_snapshot, amount, status, source
  )
  values (
    v_number, v_slot_id, p_guest_name, p_guest_phone, coalesce(p_guest_count, 1),
    v_snapshot, v_amount, 'confirmed', p_source
  )
  returning id into booking_id;

  update public.slots set status = 'booked' where id = v_slot_id;
  if v_slot2_id is not null then
    update public.slots set status = 'booked' where id = v_slot2_id;
  end if;

  booking_number := v_number;
  return next;
end;
$$;

revoke all on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int, text, boolean, int) from public;
grant execute on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int, text, boolean, int) to service_role;

-- 통합 예약 취소 시 형제(2부) 슬롯도 open 복구
create or replace function public.admin_cancel_offline_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_sibling uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.source not in ('offline', 'comp') then raise exception 'NOT_OFFLINE'; end if;

  update public.bookings set status = 'cancelled' where id = p_booking_id;
  update public.slots set status = 'open' where id = v_booking.slot_id and status = 'booked';

  if coalesce((v_booking.facility_snapshot->>'combined')::boolean, false) then
    v_sibling := nullif(v_booking.facility_snapshot->>'combined_slot_id', '')::uuid;
    if v_sibling is not null then
      update public.slots set status = 'open' where id = v_sibling and status = 'booked';
    end if;
  end if;
end;
$$;
