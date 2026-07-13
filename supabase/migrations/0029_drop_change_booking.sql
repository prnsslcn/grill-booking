-- 0029_drop_change_booking.sql
-- 고객 예약 변경(Stage 1) 롤백. 0028에서 만든 함수 제거(forward-only: 0028 파일은 보존).

drop function if exists public.change_booking_apply_tx(text, text, uuid, int, text, jsonb, int);
drop function if exists public.change_settle_refund(uuid, int, jsonb);
