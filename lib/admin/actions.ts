'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import { refundBooking } from '@/lib/booking/refund';
import { BEEF_ENABLED, isBeefAddonKey } from '@/lib/config';
import { generateSlots } from '@/lib/booking/slots';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

/**
 * 관리자 운영 액션. 각 액션은 requireAdmin()으로 호출자를 검증한 뒤
 * 서비스롤(admin 클라이언트)/기존 도메인 로직으로 실행한다.
 */

/**
 * 액션 결과. 실패 사유를 값으로 반환한다 — Next.js 프로덕션은 서버 액션에서
 * throw된 에러를 익명 digest 메시지로 가리므로, 사용자에게 보여줄 사유는 반드시
 * return 값으로 전달해야 한다(throw 금지).
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** 유선(오프라인) 예약 직접 등록 — 슬롯 점유해 온라인 가용성에서 자동 제외. */
export async function adminCreateBooking(input: {
  facilityType: string;
  date: string;
  part: number;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  meat?: 'pork' | 'beef';
  note?: string;
  addons?: Record<string, number>;
}): Promise<ActionResult> {
  await requireAdmin();
  if (input.meat === 'beef' && !BEEF_ENABLED) {
    return { ok: false, error: '소 세트는 현재 판매하지 않습니다.' };
  }
  const addons = input.addons ?? {};
  const cleanAddons = BEEF_ENABLED
    ? addons
    : Object.fromEntries(Object.entries(addons).filter(([k]) => !isBeefAddonKey(k)));
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('admin_create_booking', {
    p_facility_type: input.facilityType,
    p_date: input.date,
    p_part: input.part,
    p_guest_name: input.guestName.trim(),
    p_guest_phone: input.guestPhone.trim(),
    p_guest_count: input.guestCount,
    p_meat: input.meat ?? 'pork',
    p_note: input.note?.trim() || undefined,
    p_addons: cleanAddons,
  });
  if (error) {
    const m = error.message;
    const friendly = m.includes('NO_UNIT_AVAILABLE')
      ? '이 날짜·부에 예약 가능한 동이 없습니다. 운영일(휴무 여부)과 잔여 동을 확인하세요.'
      : m.includes('NAME_REQUIRED')
        ? '예약자명을 입력하세요.'
        : m.includes('INVALID_ADDON')
          ? '유효하지 않은 추가 옵션입니다.'
          : m.includes('FACILITY_NOT_FOUND')
            ? '시설을 찾을 수 없습니다.'
            : `예약 추가 실패: ${m}`;
    return { ok: false, error: friendly };
  }
  revalidatePath('/admin');
  revalidatePath('/booking');
  return { ok: true };
}

/** 오프라인 예약 취소(오등록 정정) — 슬롯 open 복구. */
export async function adminCancelOfflineBooking(bookingId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('admin_cancel_offline_booking', { p_booking_id: bookingId });
  if (error) return { ok: false, error: `취소 실패: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/booking');
  return { ok: true };
}

export async function adminCancelRefund(bookingNumber: string): Promise<void> {
  await requireAdmin();
  await refundBooking({ bookingNumber, reason: '관리자 취소' });
  revalidatePath('/admin');
}

export async function adminGenerateSlots(from: string, to: string): Promise<number> {
  await requireAdmin();
  const created = await generateSlots(from, to);
  revalidatePath('/admin/slots');
  return created;
}

export async function adminSetSlotStatus(
  slotId: string,
  status: 'open' | 'closed',
): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  // booked 슬롯은 토글 금지(open↔closed만)
  await supabase
    .from('slots')
    .update({ status })
    .eq('id', slotId)
    .in('status', ['open', 'closed']);
  revalidatePath('/admin/slots');
}

export async function adminCloseDate(date: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from('slots').update({ status: 'closed' }).eq('date', date).eq('status', 'open');
  revalidatePath('/admin/slots');
}

/** 특정일 오픈(성수기 등) — 금·토 외 날짜를 운영일로 등록하고 슬롯 즉시 생성. */
export async function adminAddOpenDate(date: string, note?: string): Promise<void> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('INVALID_DATE');
  const supabase = createAdminClient();
  const { error: upErr } = await supabase
    .from('open_dates')
    .upsert({ date, note: note?.trim() || null });
  if (upErr) throw new Error(`오픈일 저장 실패: ${upErr.message}`);
  // 오픈일 등록 후 해당 날짜 슬롯 멱등 생성(이제 운영일로 인정됨)
  const { error: genErr } = await supabase.rpc('generate_slots', { p_from: date, p_to: date });
  if (genErr) throw new Error(`슬롯 생성 실패: ${genErr.message}`);
  // 이전에 오픈→해제했던 날짜면 슬롯이 closed로 남아 있고 generate_slots는 기존 슬롯 상태를
  // 바꾸지 않으므로(ON CONFLICT DO NOTHING), 닫혀 있던 슬롯을 다시 연다(재오픈과 동일 동작).
  // 예약된(booked) 슬롯은 그대로 둔다.
  const { error: openErr } = await supabase
    .from('slots')
    .update({ status: 'open' })
    .eq('date', date)
    .eq('status', 'closed');
  if (openErr) throw new Error(`슬롯 열기 실패: ${openErr.message}`);
  revalidatePath('/admin/slots');
  revalidatePath('/booking');
}

/** 특정일 오픈 해제 — 등록 제거 + (평일이면) 미예약 슬롯 닫기(기존 예약은 유지). */
export async function adminRemoveOpenDate(date: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  // 금·토가 아닌 날짜만 슬롯 닫기(금·토는 기본 운영일이라 유지)
  if (dow !== 5 && dow !== 6) {
    await supabase.from('slots').update({ status: 'closed' }).eq('date', date).eq('status', 'open');
  }
  const { error: delErr } = await supabase.from('open_dates').delete().eq('date', date);
  if (delErr) throw new Error(`오픈일 해제 실패: ${delErr.message}`);
  revalidatePath('/admin/slots');
  revalidatePath('/booking');
}

/**
 * 운영일 휴무 처리 — 금·토(또는 오픈일)를 닫는다. 미예약(open) 슬롯만 닫고 기존 예약은 유지.
 * (확정 예약을 취소하려면 예약 관리에서 별도 취소·환불 처리해야 한다.)
 */
export async function adminCloseOperatingDate(date: string, note?: string): Promise<void> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('INVALID_DATE');
  const supabase = createAdminClient();
  const { error: upErr } = await supabase
    .from('closed_dates')
    .upsert({ date, note: note?.trim() || null });
  if (upErr) throw new Error(`휴무 저장 실패: ${upErr.message}`);
  // 미예약 슬롯만 닫기(예약 완료 슬롯은 booked 상태라 그대로 유지됨)
  const { error: closeErr } = await supabase
    .from('slots')
    .update({ status: 'closed' })
    .eq('date', date)
    .eq('status', 'open');
  if (closeErr) throw new Error(`슬롯 닫기 실패: ${closeErr.message}`);
  revalidatePath('/admin/slots');
  revalidatePath('/booking');
}

/** 휴무 해제 — 운영일로 되돌리고 닫혀 있던 슬롯을 다시 연다(예약 완료 슬롯은 그대로). */
export async function adminReopenOperatingDate(date: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error: delErr } = await supabase.from('closed_dates').delete().eq('date', date);
  if (delErr) throw new Error(`휴무 해제 실패: ${delErr.message}`);
  // 누락된 슬롯 멱등 생성(이제 운영일로 인정됨) + 닫혀 있던 슬롯 다시 열기
  const { error: genErr } = await supabase.rpc('generate_slots', { p_from: date, p_to: date });
  if (genErr) throw new Error(`슬롯 생성 실패: ${genErr.message}`);
  const { error: openErr } = await supabase
    .from('slots')
    .update({ status: 'open' })
    .eq('date', date)
    .eq('status', 'closed');
  if (openErr) throw new Error(`슬롯 열기 실패: ${openErr.message}`);
  revalidatePath('/admin/slots');
  revalidatePath('/booking');
}

export async function adminUpdateFacility(
  type: FacilityType,
  patch: { pricePork?: number; priceBeef?: number; isActive?: boolean },
): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const update: { price_pork?: number; price_beef?: number; is_active?: boolean } = {};
  if (patch.pricePork !== undefined) update.price_pork = patch.pricePork;
  if (patch.priceBeef !== undefined) update.price_beef = patch.priceBeef;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  await supabase.from('facilities').update(update).eq('type', type);
  revalidatePath('/admin/facilities');
  revalidatePath('/');
}

export async function adminUpdateAddon(
  key: string,
  patch: { price?: number; isActive?: boolean },
): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const update: { price?: number; is_active?: boolean } = {};
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  await supabase.from('addons').update(update).eq('key', key);
  revalidatePath('/admin/facilities');
}
