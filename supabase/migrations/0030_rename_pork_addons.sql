-- 0030_rename_pork_addons.sql
-- 돼지 추가메뉴 이름을 부위(목살) 명시로 변경. (0020은 forward-only로 보존)

update public.addons set label = '돼지 목살 추가 300g' where key = 'pork_300';
update public.addons set label = '돼지 목살 추가 600g' where key = 'pork_600';
