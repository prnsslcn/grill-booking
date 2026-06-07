-- 0022_notifications_recipient.sql
-- notifications에 수신자 구분 컬럼 추가.
-- 그동안 고객/관리자 구분을 payload->>'recipient'에 넣어왔으나, 관리자 이력 조회·필터를
-- 위해 1급 컬럼으로 승격한다. 기존 행은 payload 값으로 backfill(없으면 'customer').

alter table public.notifications
  add column recipient text not null default 'customer'
    check (recipient in ('customer', 'admin'));

-- 기존 이력 backfill: payload에 recipient가 있으면 그 값으로 보정.
update public.notifications
set recipient = payload ->> 'recipient'
where payload ->> 'recipient' in ('customer', 'admin');
