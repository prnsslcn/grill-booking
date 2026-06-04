-- 0012_refund_functions.sql
-- 환불/취소의 DB 원자 부분. 토스 취소(외부 호출)는 앱에서 두 함수 사이에 끼운다.
-- 정합성: 토스 취소 성공 → finalize_refund_tx 순서. security definer + service_role 전용.

-- ── 1단계: 취소 요청(잠금 + cancel_requested 전이 + 결제 정보 반환) ──────────────
create or replace function public.request_cancel_tx(p_order_id text)
returns table (
  booking_id   uuid,
  payment_key  text,
  paid_amount  int,
  slot_date    date,
  outcome      text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_pay     public.payments%rowtype;
  v_date    date;
begin
  select b.* into v_booking
  from public.bookings b
  where b.booking_number = p_order_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  -- 멱등: 이미 환불 완료
  if v_booking.status = 'refunded' then
    booking_id := v_booking.id;
    outcome := 'ALREADY_REFUNDED';
    return next;
    return;
  end if;

  -- 확정/요청중만 취소 가능(pending·cancelled 등 불가)
  if v_booking.status not in ('confirmed', 'cancel_requested') then
    raise exception 'NOT_CANCELLABLE';
  end if;

  if v_booking.status = 'confirmed' then
    update public.bookings set status = 'cancel_requested' where id = v_booking.id;
  end if;

  -- paid 결제 + 이용일
  select p.* into v_pay
  from public.payments p
  where p.booking_id = v_booking.id and p.status = 'paid'
  limit 1;

  select s.date into v_date from public.slots s where s.id = v_booking.slot_id;

  booking_id := v_booking.id;
  payment_key := v_pay.toss_payment_key;  -- paid 없으면 null
  paid_amount := v_booking.amount;
  slot_date := v_date;
  outcome := 'CANCEL_REQUESTED';
  return next;
end;
$$;

-- ── 2단계: 환불 확정(토스 취소 성공 후) ─────────────────────────────────────────
create or replace function public.finalize_refund_tx(
  p_booking_id      uuid,
  p_refund_amount   int,
  p_is_partial      bool,
  p_did_toss_cancel bool,
  p_raw             jsonb
)
returns table (
  booking_id      uuid,
  refunded_amount int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select b.* into v_booking from public.bookings b where b.id = p_booking_id for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  -- 멱등
  if v_booking.status = 'refunded' then
    booking_id := v_booking.id;
    refunded_amount := p_refund_amount;
    return next;
    return;
  end if;

  -- 토스 취소를 실제 한 경우에만 결제 상태 갱신(0원 환불은 paid 유지)
  if p_did_toss_cancel then
    update public.payments
    set status = case when p_is_partial then 'partial_cancelled' else 'cancelled' end,
        cancelled_at = now(),
        raw_response = p_raw
    where payments.booking_id = p_booking_id and payments.status = 'paid';
  end if;

  update public.bookings set status = 'refunded' where id = p_booking_id;
  update public.slots set status = 'open' where id = v_booking.slot_id;

  booking_id := v_booking.id;
  refunded_amount := p_refund_amount;
  return next;
end;
$$;

-- ── 권한 ────────────────────────────────────────────────────────────────────
revoke all on function public.request_cancel_tx(text) from public;
revoke all on function public.finalize_refund_tx(uuid, int, bool, bool, jsonb) from public;
grant execute on function public.request_cancel_tx(text) to service_role;
grant execute on function public.finalize_refund_tx(uuid, int, bool, bool, jsonb) to service_role;
