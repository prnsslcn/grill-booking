-- 0027_admin_booking_amount_override.sql
-- 유선(오프라인) 예약에 금액 오버라이드(p_amount) 추가.
-- 예) '타프 4인 특가(130,000원)'처럼 시설 기본가와 다른 상품가를 관리자가 지정.
-- p_amount가 주어지면 그 값을 '기본 상품가'로 쓰고, 추가메뉴(addons) 합산은 그 위에 더한다.
-- 온라인 예약(reserve_slot)은 영향 없음(이 함수만 변경).

drop function if exists public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb);

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
  p_amount        int default null
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
begin
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

  -- 기본 상품가: p_amount가 있으면 그것을, 없으면 시설 고기세트가를 사용
  if p_amount is not null then
    v_amount := p_amount;
  else
    v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;
  end if;

  -- 추가메뉴 합산(서버에서 단가 조회 — reserve_slot과 동일)
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

  v_amount := coalesce(v_amount, 0) + v_addon_total;

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
    v_snapshot, v_amount, 'confirmed', 'offline'
  )
  returning id into booking_id;

  update public.slots set status = 'booked' where id = v_slot.id;

  booking_number := v_number;
  return next;
end;
$$;

revoke all on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int) from public;
grant execute on function public.admin_create_booking(text, date, smallint, text, text, int, text, text, jsonb, int) to service_role;
