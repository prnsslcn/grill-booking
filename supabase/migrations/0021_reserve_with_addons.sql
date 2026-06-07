-- 0021_reserve_with_addons.sql
-- reserve_slot에 추가메뉴(p_addons: {key: qty}) 반영.
-- 금액 = 시설×고기 세트가 + Σ(추가메뉴 단가×수량). 추가메뉴 단가는 DB(addons)에서 조회(서버 권위).

drop function if exists public.reserve_slot(uuid, text, text, int, text);

create or replace function public.reserve_slot(
  p_slot_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_count int,
  p_meat text,
  p_addons jsonb default '{}'::jsonb
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
  v_slot        public.slots%rowtype;
  v_unit        public.facility_units%rowtype;
  v_facility    public.facilities%rowtype;
  v_active      public.bookings%rowtype;
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
  if p_meat not in ('pork', 'beef') then
    raise exception 'INVALID_MEAT';
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;
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
        update public.bookings set status = 'cancelled' where id = v_active.id;
      else
        raise exception 'SLOT_TAKEN';
      end if;
    end if;
  end if;

  select * into v_unit from public.facility_units where id = v_slot.facility_unit_id;
  select * into v_facility from public.facilities where id = v_unit.facility_id;

  v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;
  if v_amount is null or v_amount <= 0 then
    raise exception 'PRICE_NOT_SET';
  end if;

  -- 추가메뉴 합산(서버에서 단가 조회)
  if p_addons is not null then
    for v_key, v_qtytext in select * from jsonb_each_text(p_addons) loop
      v_qty := v_qtytext::int;
      if v_qty > 0 then
        select * into v_addon from public.addons where key = v_key and is_active = true;
        if not found then
          raise exception 'INVALID_ADDON';
        end if;
        v_addon_total := v_addon_total + v_addon.price * v_qty;
        v_addon_list := v_addon_list || jsonb_build_object(
          'key', v_addon.key, 'label', v_addon.label, 'price', v_addon.price, 'qty', v_qty
        );
      end if;
    end loop;
  end if;

  v_amount := v_amount + v_addon_total;

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_slot.date,
    'part',          v_slot.part,
    'meat',          p_meat,
    'capacity',      v_facility.capacity,
    'addons',        v_addon_list
  );

  v_number := 'R-' || to_char(v_slot.date, 'YYYYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 6));

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

  update public.slots set status = 'booked' where id = p_slot_id;

  booking_number := v_number;
  order_id       := v_number;
  amount         := v_amount;
  return next;
end;
$$;

revoke all on function public.reserve_slot(uuid, text, text, int, text, jsonb) from public;
grant execute on function public.reserve_slot(uuid, text, text, int, text, jsonb) to service_role;
