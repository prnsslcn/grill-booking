-- 0028_change_booking.sql
-- 고객 예약 변경(Stage 1): 날짜·부·시설·인원·메뉴 변경. 동일가/다운그레이드만 즉시 적용.
-- 업그레이드(차액 추가결제)는 이 함수에서 UPGRADE_REQUIRES_PAYMENT로 막고 Stage 2가 처리.
--
-- 정합성:
--   · 본인확인(예약번호+연락처 digits), status=confirmed
--   · 변경 허용: 현재 이용일 기준 KST 2일 이상 남음
--   · 새 슬롯: open(또는 현재 슬롯 그대로), 활성 중복 없음 → 슬롯 교체(old open / new booked)
--   · 금액은 새 구성으로 재계산(reserve_slot과 동일). 다운그레이드 차액환불은 앱에서 토스 부분취소.
--   · 슬롯 교체는 부분 유니크(bookings_active_slot_unique)로 동시성 방어.

create or replace function public.change_booking_apply_tx(
  p_booking_number text,
  p_phone          text,
  p_new_slot_id    uuid,
  p_guest_count    int,
  p_meat           text,
  p_addons         jsonb,
  p_expected_amount int
)
returns table (
  booking_id   uuid,
  old_amount   int,
  new_amount   int,
  delta        int,
  payment_key  text,
  slot_changed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking   public.bookings%rowtype;
  v_cur_slot  public.slots%rowtype;
  v_new_slot  public.slots%rowtype;
  v_unit      public.facility_units%rowtype;
  v_facility  public.facilities%rowtype;
  v_active    public.bookings%rowtype;
  v_amount    int;
  v_addon_total int := 0;
  v_addon_list  jsonb := '[]'::jsonb;
  v_key       text;
  v_qtytext   text;
  v_qty       int;
  v_addon     public.addons%rowtype;
  v_snapshot  jsonb;
  v_pay_key   text;
  v_kst_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_meat not in ('pork', 'beef') then raise exception 'INVALID_MEAT'; end if;

  -- 1) 예약 잠금 + 본인확인
  select b.* into v_booking from public.bookings b
  where b.booking_number = p_booking_number for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if regexp_replace(v_booking.guest_phone, '\D', '', 'g')
     <> regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'confirmed' then raise exception 'NOT_CHANGEABLE'; end if;

  -- 2) 변경 허용 시점: 현재 이용일 기준 2일 이상 남음
  select * into v_cur_slot from public.slots where id = v_booking.slot_id;
  if (v_cur_slot.date - v_kst_today) < 2 then
    raise exception 'CHANGE_WINDOW_CLOSED';
  end if;

  -- 3) 새 슬롯 잠금·검증(현재 슬롯이면 그대로 사용)
  select * into v_new_slot from public.slots where id = p_new_slot_id for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if v_new_slot.status = 'closed' then raise exception 'SLOT_CLOSED'; end if;
  if p_new_slot_id <> v_booking.slot_id then
    -- 다른 슬롯으로 이동: 활성 예약이 점유 중이면 불가
    if v_new_slot.status = 'booked' then
      select * into v_active from public.bookings
      where slot_id = p_new_slot_id
        and status in ('pending_payment','confirmed','cancel_requested')
      limit 1;
      if found then raise exception 'SLOT_TAKEN'; end if;
    end if;
  end if;

  select * into v_unit from public.facility_units where id = v_new_slot.facility_unit_id;
  select * into v_facility from public.facilities where id = v_unit.facility_id;
  if not v_facility.is_active then raise exception 'FACILITY_NOT_FOUND'; end if;

  -- 4) 새 금액 계산(reserve_slot과 동일 규칙)
  v_amount := case p_meat when 'pork' then v_facility.price_pork else v_facility.price_beef end;
  if v_amount is null or v_amount <= 0 then raise exception 'PRICE_NOT_SET'; end if;
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
  v_amount := v_amount + v_addon_total;

  -- 5) 가격 드리프트 가드(미리보기와 불일치 시 중단)
  if v_amount <> p_expected_amount then raise exception 'AMOUNT_CHANGED'; end if;

  -- 6) 업그레이드는 Stage 2(추가결제)로
  if v_amount > v_booking.amount then raise exception 'UPGRADE_REQUIRES_PAYMENT'; end if;

  -- 7) 슬롯 교체 + 예약 갱신
  if p_new_slot_id <> v_booking.slot_id then
    update public.slots set status = 'open'   where id = v_booking.slot_id;
    update public.slots set status = 'booked' where id = p_new_slot_id;
  end if;

  v_snapshot := jsonb_build_object(
    'facility_type', v_facility.type,
    'facility_name', v_facility.name,
    'unit_label',    v_unit.unit_label,
    'date',          v_new_slot.date,
    'part',          v_new_slot.part,
    'meat',          p_meat,
    'capacity',      v_facility.capacity,
    'addons',        v_addon_list
  );

  update public.bookings
  set slot_id = p_new_slot_id,
      guest_count = coalesce(p_guest_count, 1),
      facility_snapshot = v_snapshot,
      amount = v_amount
  where id = v_booking.id;

  select p.toss_payment_key into v_pay_key
  from public.payments p
  where p.booking_id = v_booking.id and p.status = 'paid'
  limit 1;

  booking_id   := v_booking.id;
  old_amount   := v_booking.amount;
  new_amount   := v_amount;
  delta        := v_amount - v_booking.amount;
  payment_key  := v_pay_key;
  slot_changed := (p_new_slot_id <> v_booking.slot_id);
  return next;
end;
$$;

revoke all on function public.change_booking_apply_tx(text, text, uuid, int, text, jsonb, int) from public;
grant execute on function public.change_booking_apply_tx(text, text, uuid, int, text, jsonb, int) to service_role;

-- 다운그레이드 부분환불 후 결제원장 반영: 원 결제행 금액을 새 금액으로 조정(순매출 정확).
create or replace function public.change_settle_refund(
  p_booking_id uuid,
  p_new_amount int,
  p_raw        jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set amount = p_new_amount, raw_response = p_raw
  where payments.booking_id = p_booking_id and payments.status = 'paid';
end;
$$;

revoke all on function public.change_settle_refund(uuid, int, jsonb) from public;
grant execute on function public.change_settle_refund(uuid, int, jsonb) to service_role;
