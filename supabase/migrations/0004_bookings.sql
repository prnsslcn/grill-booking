-- 0004_bookings.sql
-- 예약 1건. 결제 금액·시설 정보를 스냅샷으로 보관.
-- 슬롯 중복 예약 방지의 최종(2차) 방어선: UNIQUE (slot_id).

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  -- 고객 조회용 예약번호 (예: R-20260612-A3F9)
  booking_number  text not null unique,
  -- 한 슬롯당 확정 예약 1건만. 동시 요청이 들어와도 둘 중 하나만 INSERT 성공.
  slot_id         uuid not null references public.slots (id) on delete restrict,
  guest_name      text not null,
  guest_phone     text not null,
  guest_count     int  not null default 1 check (guest_count > 0),
  -- 예약 시점 시설명·종류 등 스냅샷(가격 변경에도 과거 기록 보존)
  facility_snapshot jsonb not null,
  -- 결제 금액 스냅샷(원 단위 정수). 선결제 전제이므로 양수.
  amount          int  not null check (amount > 0),
  status          text not null default 'pending_payment'
                    check (status in (
                      'pending_payment',  -- 결제 진행 중(슬롯 선점)
                      'confirmed',        -- 서버 재검증된 결제 승인 → 확정
                      'cancelled',        -- 결제 미완료로 무산
                      'cancel_requested', -- 확정 후 취소 요청(환불 대기)
                      'refunded'          -- 토스 환불 완료
                    )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- 슬롯 중복 방지 최종 방어선
  constraint bookings_slot_id_unique unique (slot_id)
);

create index bookings_status_idx on public.bookings (status);
create index bookings_guest_phone_idx on public.bookings (guest_phone);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();
