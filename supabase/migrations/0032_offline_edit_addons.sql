-- 0032_offline_edit_addons.sql
-- 유선(offline) 예약 내용 변경: 현장에서 고기 추가 등 추가메뉴가 발생하면 관리자가 상세에서
-- 추가메뉴를 갱신하고 금액을 다시 계산해 정산 정합성을 맞춘다.
--   · 기본 상품가(base)는 보존: base = 현재 amount − 기존 추가메뉴 합계.
--     → 특가 오버라이드(예: 타프 4인 130,000)나 시설가가 그대로 유지된다.
--   · 새 금액 = base + 새 추가메뉴 합계(단가는 서버에서 addons 테이블 조회).
-- offline·confirmed 예약만 대상. 결제(payments) 연동 없음(현장 현금/계좌 정산 전제).

create or replace function public.admin_update_offline_booking(
  p_booking_id uuid,
  p_addons     jsonb
)
returns table (amount int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking         public.bookings%rowtype;
  v_old_addon_total int := 0;
  v_new_addon_total int := 0;
  v_new_list        jsonb := '[]'::jsonb;
  v_base            int;
  v_new_amount      int;
  v_key             text;
  v_qtytext         text;
  v_qty             int;
  v_addon           public.addons%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.source <> 'offline' then raise exception 'NOT_OFFLINE'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'NOT_EDITABLE'; end if;

  -- 기존 추가메뉴 합계(스냅샷 기준)
  select coalesce(sum((a->>'price')::int * (a->>'qty')::int), 0)
    into v_old_addon_total
    from jsonb_array_elements(coalesce(v_booking.facility_snapshot->'addons', '[]'::jsonb)) a;

  -- 새 추가메뉴 합계 + 목록(단가는 서버에서 조회 — 클라이언트 값 불신)
  if p_addons is not null then
    for v_key, v_qtytext in select * from jsonb_each_text(p_addons) loop
      v_qty := v_qtytext::int;
      if v_qty > 0 then
        select * into v_addon from public.addons where key = v_key and is_active = true;
        if not found then raise exception 'INVALID_ADDON'; end if;
        v_new_addon_total := v_new_addon_total + v_addon.price * v_qty;
        v_new_list := v_new_list || jsonb_build_object(
          'key', v_addon.key, 'label', v_addon.label, 'price', v_addon.price, 'qty', v_qty
        );
      end if;
    end loop;
  end if;

  v_base := v_booking.amount - v_old_addon_total;
  v_new_amount := v_base + v_new_addon_total;
  if v_new_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  update public.bookings
     set amount = v_new_amount,
         facility_snapshot = jsonb_set(facility_snapshot, '{addons}', v_new_list),
         updated_at = now()
   where id = p_booking_id;

  amount := v_new_amount;
  return next;
end;
$$;

revoke all on function public.admin_update_offline_booking(uuid, jsonb) from public;
grant execute on function public.admin_update_offline_booking(uuid, jsonb) to service_role;
