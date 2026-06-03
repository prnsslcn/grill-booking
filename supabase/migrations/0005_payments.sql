-- 0005_payments.sql
-- 토스페이먼츠 결제 기록. 예약과 연결.

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings (id) on delete restrict,
  -- 토스 결제 키. 승인 전에는 null일 수 있어 nullable(unique는 null 다중 허용).
  toss_payment_key text unique,
  -- 주문 ID. 결제 생성 시점에 발급되어 멱등성·중복 승인 방지의 키.
  toss_order_id    text not null unique,
  -- 승인 금액(원). bookings.amount 와 일치 검증 대상.
  amount           int  not null check (amount > 0),
  status           text not null default 'ready'
                    check (status in (
                      'ready',             -- 결제 생성, 승인 전
                      'paid',              -- 승인 완료
                      'cancelled',         -- 전액 취소
                      'partial_cancelled'  -- 부분 취소(예: 50% 환불)
                    )),
  method           text,
  approved_at      timestamptz,
  cancelled_at     timestamptz,
  -- 토스 응답 원본(감사용)
  raw_response     jsonb,
  created_at       timestamptz not null default now()
);

-- 예약별 결제 조회(재시도 이력 포함 가능하므로 unique 아닌 index)
create index payments_booking_id_idx on public.payments (booking_id);
