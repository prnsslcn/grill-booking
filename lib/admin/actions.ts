'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import { refundBooking } from '@/lib/booking/refund';
import { generateSlots } from '@/lib/booking/slots';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

/**
 * 관리자 운영 액션. 각 액션은 requireAdmin()으로 호출자를 검증한 뒤
 * 서비스롤(admin 클라이언트)/기존 도메인 로직으로 실행한다.
 */

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
  await supabase.from('open_dates').upsert({ date, note: note?.trim() || null });
  // 오픈일 등록 후 해당 날짜 슬롯 멱등 생성(이제 운영일로 인정됨)
  await supabase.rpc('generate_slots', { p_from: date, p_to: date });
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
  await supabase.from('open_dates').delete().eq('date', date);
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
