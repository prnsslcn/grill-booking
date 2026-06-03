-- 0002_facilities_units.sql
-- 시설 종류(facilities)와 개별 동(facility_units). 예약 대상의 정의.

create table public.facilities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('tarp_tent', 'cabin', 'trailer')),
  name        text not null,
  total_units int  not null check (total_units > 0),
  -- 금액은 원 단위 정수(부동소수점 금지). 0 = 가격 미설정(관리자에서 지정 전).
  price       int  not null default 0 check (price >= 0),
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

create table public.facility_units (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete restrict,
  unit_label  text not null,
  -- 점검/휴무 시 false → 슬롯 생성 대상에서 제외
  is_active   bool not null default true,
  unique (facility_id, unit_label)
);

create index facility_units_facility_id_idx on public.facility_units (facility_id);
