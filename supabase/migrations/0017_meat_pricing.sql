-- 0017_meat_pricing.sql
-- 가격 체계를 '시설 × 고기종류(돼지/소)'로 전환. 기존 단일 price 제거.

alter table public.facilities add column if not exists price_pork int not null default 0;
alter table public.facilities add column if not exists price_beef int not null default 0;

-- 공식 운영안 세트가 (원). 4인=야외테이블, 6인=타프, 8인=카바나
update public.facilities set price_pork = 130000, price_beef = 190000 where type = 'outdoor_table';
update public.facilities set price_pork = 160000, price_beef = 250000 where type = 'tarp_tent';
update public.facilities set price_pork = 190000, price_beef = 310000 where type = 'cabin';

-- 단일 price 컬럼 폐기(고기별 가격으로 대체). 관련 CHECK도 함께 제거됨.
alter table public.facilities drop column price;
