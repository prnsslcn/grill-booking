-- 0018_reserve_with_meat.sql
-- reserve_slot에 고기종류(p_meat) 추가 → 금액 = 시설×고기 가격, 스냅샷에 meat 저장.

drop function if exists public.reserve_slot(uuid, text, text, int);

create or replace function public.reserve_slot(
  p_slot_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_count int,
  p_meat text
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

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_slot.date,
    'part',          v_slot.part,
    'meat',          p_meat,
    'capacity',      v_facility.capacity
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

revoke all on function public.reserve_slot(uuid, text, text, int, text) from public;
grant execute on function public.reserve_slot(uuid, text, text, int, text) to service_role;
