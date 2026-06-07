-- 0020_addons.sql
-- 추가 판매(고기 추가) 카탈로그. 가격은 DB가 보유 → reserve_slot이 서버에서 합산(클라 금액 불신).

create table public.addons (
  key       text primary key,
  label     text not null,
  price     int  not null check (price >= 0),
  sort      int  not null default 0,
  is_active bool not null default true
);

insert into public.addons (key, label, price, sort) values
  ('pork_300', '돼지고기 추가 300g', 30000, 1),
  ('pork_600', '돼지고기 추가 600g', 60000, 2),
  ('beef_300', '소고기 추가 300g',  60000, 3),
  ('beef_600', '소고기 추가 600g', 120000, 4);

alter table public.addons enable row level security;

create policy addons_select_public on public.addons
  for select to anon, authenticated using (true);
create policy addons_admin_write on public.addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
