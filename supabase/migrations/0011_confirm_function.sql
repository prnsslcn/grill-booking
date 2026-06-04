-- 0011_confirm_function.sql
-- 결제 승인 재검증 후 예약 확정의 DB 원자 부분.
-- 토스 승인 API 호출(외부)은 앱에서 하고, 이 함수는 검증+payments+booking을 단일 트랜잭션으로.
-- security definer + service_role 전용.

create or replace function public.confirm_booking_tx(
  p_order_id     text,
  p_payment_key  text,
  p_amount       int,
  p_method       text,
  p_approved_at  timestamptz,
  p_raw          jsonb
)
returns table (
  booking_id     uuid,
  booking_number text,
  outcome        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  -- 1) 예약 잠금 (order_id == booking_number 연결고리)
  -- 별칭 b로 컬럼을 명확히(반환 테이블의 OUT 변수 booking_number와 충돌 방지)
  select b.* into v_booking
  from public.bookings b
  where b.booking_number = p_order_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  -- 2) 멱등: 이미 확정된 예약이면 no-op
  if v_booking.status = 'confirmed' then
    booking_id := v_booking.id;
    booking_number := v_booking.booking_number;
    outcome := 'ALREADY_CONFIRMED';
    return next;
    return;
  end if;

  -- 3) pending_payment 아니면(취소·만료 회수) 확정 불가 → 앱이 보상 환불
  if v_booking.status <> 'pending_payment' then
    raise exception 'BOOKING_NOT_PENDING';
  end if;

  -- 4) 금액 재검증 (토스 승인액 vs 예약 스냅샷)
  if p_amount <> v_booking.amount then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  -- 5) 결제 기록. 중복 confirm(같은 order/key)은 UNIQUE 위반 → 멱등 처리.
  begin
    insert into public.payments (
      booking_id, toss_payment_key, toss_order_id, amount,
      status, method, approved_at, raw_response
    )
    values (
      v_booking.id, p_payment_key, p_order_id, p_amount,
      'paid', p_method, p_approved_at, p_raw
    );
  exception when unique_violation then
    booking_id := v_booking.id;
    booking_number := v_booking.booking_number;
    outcome := 'ALREADY_CONFIRMED';
    return next;
    return;
  end;

  -- 6) 예약 확정
  update public.bookings set status = 'confirmed' where id = v_booking.id;

  booking_id := v_booking.id;
  booking_number := v_booking.booking_number;
  outcome := 'CONFIRMED';
  return next;
end;
$$;

revoke all on function public.confirm_booking_tx(text, text, int, text, timestamptz, jsonb) from public;
grant execute on function public.confirm_booking_tx(text, text, int, text, timestamptz, jsonb) to service_role;
