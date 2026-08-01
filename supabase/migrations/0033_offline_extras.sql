-- 0033_offline_extras.sql
-- 유선(offline) 예약 '내용 변경'에 현장 추가/조정 항목(extras)을 추가.
--   · extras = [{ label text, amount int }], amount는 음수 허용(현장 할인 등).
--     예) 캔음료 +2,500 / 생수 +1,500 / 임의 +10,000 / 특가 할인 −10,000
--   · 최종 금액 = base + 추가메뉴(addons) 합계 + extras 합계.
--     base(기본 상품가)는 보존: base = 현재 amount − 기존 addons 합계 − 기존 extras 합계.
-- 월말보고 실수령액 정합용. offline·confirmed 예약만.

drop function if exists public.admin_update_offline_booking(uuid, jsonb);

create or replace function public.admin_update_offline_booking(
  p_booking_id uuid,
  p_addons     jsonb,
  p_extras     jsonb default '[]'::jsonb
)
returns table (amount int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking          public.bookings%rowtype;
  v_old_addon_total  int := 0;
  v_old_extras_total int := 0;
  v_new_addon_total  int := 0;
  v_new_extras_total int := 0;
  v_addon_list       jsonb := '[]'::jsonb;
  v_extras_list      jsonb := '[]'::jsonb;
  v_base             int;
  v_new_amount       int;
  v_key              text;
  v_qtytext          text;
  v_qty              int;
  v_addon            public.addons%rowtype;
  v_item             jsonb;
  v_label            text;
  v_amt              int;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.source <> 'offline' then raise exception 'NOT_OFFLINE'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'NOT_EDITABLE'; end if;

  -- 기존 합계
  select coalesce(sum((a->>'price')::int * (a->>'qty')::int), 0)
    into v_old_addon_total
    from jsonb_array_elements(coalesce(v_booking.facility_snapshot->'addons', '[]'::jsonb)) a;
  select coalesce(sum((e->>'amount')::int), 0)
    into v_old_extras_total
    from jsonb_array_elements(coalesce(v_booking.facility_snapshot->'extras', '[]'::jsonb)) e;

  -- 새 추가메뉴(단가는 서버 조회)
  if p_addons is not null then
    for v_key, v_qtytext in select * from jsonb_each_text(p_addons) loop
      v_qty := v_qtytext::int;
      if v_qty > 0 then
        select * into v_addon from public.addons where key = v_key and is_active = true;
        if not found then raise exception 'INVALID_ADDON'; end if;
        v_new_addon_total := v_new_addon_total + v_addon.price * v_qty;
        v_addon_list := v_addon_list || jsonb_build_object(
          'key', v_addon.key, 'label', v_addon.label, 'price', v_addon.price, 'qty', v_qty
        );
      end if;
    end loop;
  end if;

  -- 새 현장 추가/조정(라벨 + 금액, 음수 허용)
  if p_extras is not null then
    for v_item in select * from jsonb_array_elements(p_extras) loop
      v_label := btrim(coalesce(v_item->>'label', ''));
      v_amt := coalesce((v_item->>'amount')::int, 0);
      if v_label = '' and v_amt = 0 then continue; end if;
      if v_label = '' then v_label := '현장 조정'; end if;
      v_new_extras_total := v_new_extras_total + v_amt;
      v_extras_list := v_extras_list || jsonb_build_object('label', v_label, 'amount', v_amt);
    end loop;
  end if;

  v_base := v_booking.amount - v_old_addon_total - v_old_extras_total;
  v_new_amount := v_base + v_new_addon_total + v_new_extras_total;
  if v_new_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  update public.bookings
     set amount = v_new_amount,
         facility_snapshot = jsonb_set(
           jsonb_set(facility_snapshot, '{addons}', v_addon_list),
           '{extras}', v_extras_list
         ),
         updated_at = now()
   where id = p_booking_id;

  amount := v_new_amount;
  return next;
end;
$$;

revoke all on function public.admin_update_offline_booking(uuid, jsonb, jsonb) from public;
grant execute on function public.admin_update_offline_booking(uuid, jsonb, jsonb) to service_role;
