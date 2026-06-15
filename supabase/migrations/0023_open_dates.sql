-- 0023_open_dates.sql
-- 관리자 지정 운영일(특정일 오픈). 평소엔 금·토만 운영하지만, 성수기 등 admin이 연 날짜에도
-- 슬롯을 생성·예약할 수 있게 한다. 운영일 = 금·토 ∪ open_dates.

create table public.open_dates (
  date       date primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- 조회는 공개(달력 노출), 쓰기는 관리자만 (addons/slots와 동일 패턴)
alter table public.open_dates enable row level security;
create policy open_dates_select_public on public.open_dates
  for select to anon, authenticated using (true);
create policy open_dates_admin_write on public.open_dates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 운영일 제약을 금·토 고정 CHECK → "금·토 ∪ open_dates" 트리거로 교체
-- (CHECK는 타 테이블 참조 불가하므로 트리거로 검증)
alter table public.slots drop constraint if exists slots_operating_day_check;

create or replace function public.slots_operating_day_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if extract(dow from new.date) not in (5, 6)
     and not exists (select 1 from public.open_dates od where od.date = new.date) then
    raise exception '운영일(금·토) 또는 지정 오픈일이 아닙니다: %', new.date;
  end if;
  return new;
end;
$$;

drop trigger if exists slots_operating_day_trg on public.slots;
create trigger slots_operating_day_trg
  before insert on public.slots
  for each row execute function public.slots_operating_day_guard();

-- generate_slots: 금·토 OR open_dates 날짜에 멱등 생성
create or replace function public.generate_slots(p_from date, p_to date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.slots (facility_unit_id, date, part, status)
  select fu.id, d::date, parts.p, 'open'
  from public.facility_units fu
  cross join generate_series(p_from, p_to, interval '1 day') as d
  cross join (values (1), (2)) as parts(p)
  where fu.is_active = true
    and (
      extract(dow from d) in (5, 6)
      or exists (select 1 from public.open_dates od where od.date = d::date)
    )
  on conflict (facility_unit_id, date, part) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
