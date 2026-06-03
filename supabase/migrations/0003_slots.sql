-- 0003_slots.sql
-- 예약 가능 슬롯 = 개별 동 × 날짜 × 부.
-- 슬롯 중복 예약 방지의 1차 방어선: UNIQUE (facility_unit_id, date, part).

create table public.slots (
  id               uuid primary key default gen_random_uuid(),
  facility_unit_id uuid not null references public.facility_units (id) on delete restrict,
  date             date not null,
  -- 2부제: 1 = 1부(17:00~19:00), 2 = 2부(19:30~21:30)
  part             smallint not null check (part in (1, 2)),
  status           text not null default 'open' check (status in ('open', 'closed', 'booked')),
  created_at       timestamptz not null default now(),

  -- 핵심: 같은 동의 같은 날짜·같은 부는 슬롯이 단 하나만 존재(중복 1차 차단)
  constraint slots_unit_date_part_unique unique (facility_unit_id, date, part),

  -- 운영일은 금(dow=5)/토(dow=6)만. (운영 정책 변경 시 이 제약을 조정)
  constraint slots_operating_day_check check (extract(dow from date) in (5, 6))
);

-- 가용 슬롯 조회(날짜·상태) 가속
create index slots_date_status_idx on public.slots (date, status);
