-- 0019_weather_dependent.sql
-- 우천 영향 시설 표시용 플래그. 야외 테이블(4인)은 우천 시 운영 제한 대상.
-- (실제 취소는 관리자 판단 — 여기선 안내 표시용 데이터)

alter table public.facilities add column if not exists weather_dependent boolean not null default false;

update public.facilities set weather_dependent = true where type = 'outdoor_table';
