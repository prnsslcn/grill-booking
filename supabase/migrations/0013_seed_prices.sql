-- 0013_seed_prices.sql
-- 시설 임시 판매가 설정(현재 0원이면 예약이 PRICE_NOT_SET로 막힘).
-- 실제 가격은 추후 관리자 페이지에서 수정 전제. 원 단위 정수.

update public.facilities set price = 50000  where type = 'tarp_tent' and price = 0;
update public.facilities set price = 80000  where type = 'cabin'     and price = 0;
update public.facilities set price = 100000 where type = 'trailer'   and price = 0;
