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
