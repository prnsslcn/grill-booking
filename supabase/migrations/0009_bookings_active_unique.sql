-- 0009_bookings_active_unique.sql
-- 슬롯 중복 방지 제약을 '활성 상태에만 적용되는 부분 유니크'로 교체.
--
-- 기존 무조건 UNIQUE(slot_id)는 취소/만료 예약까지 슬롯을 영구 점유 → 재예약 불가.
-- schema.md 의도("한 슬롯에 확정 예약 1건")대로, 활성 상태에서만 1건을 강제한다.
-- cancelled/refunded는 점유에서 빠져 지연 회수·재예약이 가능해진다.

alter table public.bookings
  drop constraint bookings_slot_id_unique;

create unique index bookings_active_slot_unique
  on public.bookings (slot_id)
  where status in ('pending_payment', 'confirmed', 'cancel_requested');
