-- 0014_schedule_expiry.sql
-- pending_payment 만료 예약을 10분마다 자동 회수(cancelled + 슬롯 open 복구).
-- Vercel Cron은 무료 플랜에서 일 1회 제한 → DB 내부 pg_cron으로 분 단위 스케줄.

create extension if not exists pg_cron;

-- 재적용(db reset/push) 시 중복 방지: 기존 잡 있으면 제거 후 재등록
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-pending-bookings') then
    perform cron.unschedule('expire-pending-bookings');
  end if;
end $$;

-- 10분마다 만료 스윕 실행. expire_pending_bookings는 기본 타임아웃(pending_payment_timeout=10분) 사용.
select cron.schedule(
  'expire-pending-bookings',
  '*/10 * * * *',
  $$ select public.expire_pending_bookings(); $$
);
