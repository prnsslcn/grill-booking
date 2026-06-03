-- 0008_rls_policies.sql
-- 모든 테이블 RLS 활성화 + 정책. 스키마가 안정된 마지막에 켠다.
--
-- 원칙:
--   - service_role 키(서버 admin 클라이언트)는 RLS를 우회한다 → 예약 생성/결제/환불은 서버에서.
--   - anon/authenticated 고객: 가용성 정보(시설·동·슬롯)는 읽기 허용, 그 외 쓰기·민감정보 차단.
--   - bookings·payments·notifications: 고객 직접 접근 차단(조회는 서버 라우트가 booking_number+phone 검증).
--   - admins: 본인 행 조회 + 관리자(is_admin) 전체 접근.

-- 관리자 판별 함수. security definer로 admins를 조회 → 다른 테이블 정책에서 호출해도 RLS 재귀 없음.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

-- RLS 활성화
alter table public.facilities      enable row level security;
alter table public.facility_units  enable row level security;
alter table public.slots           enable row level security;
alter table public.bookings        enable row level security;
alter table public.payments        enable row level security;
alter table public.admins          enable row level security;
alter table public.notifications   enable row level security;

-- ── 가용성 데이터: 고객 읽기 허용, 쓰기는 관리자만 ──────────────────────────
create policy facilities_select_public on public.facilities
  for select to anon, authenticated using (true);
create policy facilities_admin_write on public.facilities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy facility_units_select_public on public.facility_units
  for select to anon, authenticated using (true);
create policy facility_units_admin_write on public.facility_units
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy slots_select_public on public.slots
  for select to anon, authenticated using (true);
create policy slots_admin_write on public.slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── 예약·결제·알림: 고객 직접 접근 차단(서버 service_role 경유), 관리자만 직접 접근 ──
create policy bookings_admin_all on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy payments_admin_all on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy notifications_admin_all on public.notifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── admins: 본인 행 조회 + 관리자 전체 접근 ──────────────────────────────────
create policy admins_select_self on public.admins
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy admins_admin_write on public.admins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
