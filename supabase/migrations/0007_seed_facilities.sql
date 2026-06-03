-- 0007_seed_facilities.sql
-- 시설 종류 3종 + 개별 동 13개 시드. (타프 8 + 캐빈 4 + 트레일러 1 = 13)
-- price는 0(미설정) — 판매 전 관리자 페이지에서 실제 가격 입력 필요.
-- bookings.amount > 0 제약이 있어, 가격 0인 상태로는 예약이 생성되지 않음(의도된 안전장치).

insert into public.facilities (id, type, name, total_units, price, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'tarp_tent', '타프 텐트',   8, 0, true),
  ('22222222-2222-2222-2222-222222222222', 'cabin',     '캐빈 하우스', 4, 0, true),
  ('33333333-3333-3333-3333-333333333333', 'trailer',   '트레일러',   1, 0, true);

-- 각 시설의 total_units 만큼 개별 동 생성 (예: "타프 텐트 1호" ~ "8호")
insert into public.facility_units (facility_id, unit_label, is_active)
select f.id, f.name || ' ' || g.n || '호', true
from public.facilities f
cross join lateral generate_series(1, f.total_units) as g(n);
