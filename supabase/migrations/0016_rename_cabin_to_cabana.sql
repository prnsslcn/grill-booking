-- 0016_rename_cabin_to_cabana.sql
-- 시설 표시명·정원 조정. (type 코드는 내부 식별자라 'cabin' 유지, 표시명만 변경)
-- 기존 예약의 facility_snapshot은 예약 시점 값을 보존하므로 건드리지 않는다.

-- 타프 텐트: 6인 기준(확인)
update public.facilities set capacity = 6 where type = 'tarp_tent';

-- 캐빈 하우스 → 카바나, 8인 기준
update public.facilities set name = '카바나', capacity = 8 where type = 'cabin';
