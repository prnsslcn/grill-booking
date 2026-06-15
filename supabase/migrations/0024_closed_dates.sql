-- 0024_closed_dates.sql
-- 관리자 휴무 처리(블랙아웃). 금·토(기본 운영일)나 지정 오픈일이라도 admin이 닫은 날짜는 운영 제외.
-- 운영일 = (금·토 ∪ open_dates) − closed_dates.

create table public.closed_dates (
  date       date primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- 조회는 공개(달력 노출), 쓰기는 관리자만 (open_dates와 동일 패턴)
alter table public.closed_dates enable row level security;
create policy closed_dates_select_public on public.closed_dates
  for select to anon, authenticated using (true);
create policy closed_dates_admin_write on public.closed_dates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 운영일 가드: 금·토 ∪ open_dates 여도 closed_dates면 신규 슬롯 insert 차단
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
  if exists (select 1 from public.closed_dates cd where cd.date = new.date) then
    raise exception '휴무 처리된 날짜입니다: %', new.date;
  end if;
  return new;
end;
$$;

-- generate_slots: (금·토 OR open_dates) AND NOT closed_dates 에 멱등 생성
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
    and not exists (select 1 from public.closed_dates cd where cd.date = d::date)
  on conflict (facility_unit_id, date, part) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
