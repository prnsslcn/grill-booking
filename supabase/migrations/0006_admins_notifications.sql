-- 0006_admins_notifications.sql
-- 관리자 권한 매핑(admins)과 알림 발송 이력(notifications).

create table public.admins (
  -- Supabase Auth 사용자와 1:1. 인증은 Auth, 권한 체크는 이 테이블 + RLS.
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  type       text not null check (type in ('confirm', 'reminder', 'cancel')),
  -- 발송 채널(확장 대비). 발송 대행 서비스는 미정 — 이력 구조만 선확보.
  channel    text not null default 'sms' check (channel in ('sms', 'kakao_alimtalk')),
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at    timestamptz,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index notifications_booking_id_idx on public.notifications (booking_id);
