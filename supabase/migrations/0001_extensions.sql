-- 0001_extensions.sql
-- 확장 및 공용 유틸리티. 이후 모든 테이블의 토대.

-- gen_random_uuid() 사용을 위한 확장
create extension if not exists pgcrypto;

-- updated_at 자동 갱신 트리거 함수 (bookings 등에서 재사용)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
