-- 0015_replace_trailer_with_outdoor_table.sql
-- 트레일러 제거 + '야외 테이블'(4인) 10동 추가.
-- 시설별 정원이 달라져 facilities.capacity(기본 인원) 컬럼 신설.

-- 1) 정원 컬럼 추가(기존 시설은 기본 6인)
alter table public.facilities add column if not exists capacity int not null default 6;

-- 2) 트레일러 제거 (참조 슬롯 먼저 정리. 트레일러 확정 예약이 있으면 슬롯 삭제가 막히니
--    그 경우 먼저 환불/정리 후 재시도해야 한다 — 현재는 트레일러 예약 없음 전제)
delete from public.slots s
  using public.facility_units fu, public.facilities f
  where s.facility_unit_id = fu.id and fu.facility_id = f.id and f.type = 'trailer';
delete from public.facility_units fu
  using public.facilities f
  where fu.facility_id = f.id and f.type = 'trailer';
delete from public.facilities where type = 'trailer';

-- 3) type CHECK 갱신 (trailer 제거, outdoor_table 추가)
alter table public.facilities drop constraint facilities_type_check;
alter table public.facilities add constraint facilities_type_check
  check (type in ('tarp_tent', 'cabin', 'outdoor_table'));

-- 4) 야외 테이블 추가 (4인, 10동, 가격은 placeholder — 관리자에서 조정)
insert into public.facilities (type, name, total_units, price, capacity, is_active)
values ('outdoor_table', '야외 테이블', 10, 30000, 4, true);

insert into public.facility_units (facility_id, unit_label, is_active)
select f.id, '야외 테이블 ' || g.n || '호', true
from public.facilities f
cross join generate_series(1, 10) as g(n)
where f.type = 'outdoor_table';
