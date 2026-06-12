import 'server-only';

import { refundAmount, refundRate } from '@/lib/policy/refund';
import { createAdminClient } from '@/lib/supabase/admin';
import { PARTS, type Part } from '@/types/domain';

/**
 * 예약 조회 — booking_number + 연락처 일치를 서버에서 검증(비회원, 로그인 없음).
 * 어느 필드가 틀렸는지 노출하지 않는다(불일치/미존재 모두 null).
 */

export interface RefundPreview {
  cancellable: boolean;
  rate: number; // 0~1
  amount: number; // 환불 예상액(원)
}

export interface LookupResult {
  bookingNumber: string;
  status: string;
  guestName: string;
  guestCount: number;
  facilityName: string;
  unitLabel: string;
  meatLabel: string;
  addons: { label: string; qty: number }[];
  date: string;
  part: Part;
  partLabel: string;
  partTime: string; // "17:00~19:00"
  amount: number;
  paymentStatus: 'paid' | 'cancelled' | 'partial_cancelled' | 'none';
  createdAt: string;
  refundPreview: RefundPreview | null;
}

/** 숫자만 남겨 전화번호 정규화(하이픈·공백 차이 흡수). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

interface SnapshotShape {
  facility_name?: string;
  unit_label?: string;
  meat?: string;
  addons?: { label: string; qty: number; price: number }[];
}

const MEAT_LABEL: Record<string, string> = { pork: 'Pork', beef: 'Beef' };

export async function lookupBooking(params: {
  bookingNumber: string;
  phone: string;
}): Promise<LookupResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'booking_number, status, guest_name, guest_phone, guest_count, facility_snapshot, amount, created_at, slots(date, part, status), payments(status)',
    )
    .eq('booking_number', params.bookingNumber)
    .maybeSingle();

  if (error || !data) return null;

  // 연락처 일치 검증(정규화 비교)
  if (normalizePhone(data.guest_phone) !== normalizePhone(params.phone)) {
    return null;
  }

  const slot = data.slots;
  if (!slot) return null;

  const snapshot = (data.facility_snapshot ?? {}) as SnapshotShape;
  const part = slot.part as Part;
  const partInfo = PARTS[part];

  // 결제 상태 파생: paid 우선, 없으면 취소/none
  const paymentStatuses = (data.payments ?? []).map((p) => p.status);
  const paymentStatus: LookupResult['paymentStatus'] = paymentStatuses.includes('paid')
    ? 'paid'
    : paymentStatuses.includes('partial_cancelled')
      ? 'partial_cancelled'
      : paymentStatuses.includes('cancelled')
        ? 'cancelled'
        : 'none';

  // 환불 미리보기: 확정 예약만 취소 가능
  let refundPreview: RefundPreview | null = null;
  if (data.status === 'confirmed') {
    const now = new Date();
    refundPreview = {
      cancellable: true,
      rate: refundRate(slot.date, now),
      amount: refundAmount(data.amount, slot.date, now),
    };
  }

  return {
    bookingNumber: data.booking_number,
    status: data.status,
    guestName: data.guest_name,
    guestCount: data.guest_count,
    facilityName: snapshot.facility_name ?? '',
    unitLabel: snapshot.unit_label ?? '',
    meatLabel: snapshot.meat ? (MEAT_LABEL[snapshot.meat] ?? snapshot.meat) : '',
    addons: (snapshot.addons ?? []).map((a) => ({ label: a.label, qty: a.qty })),
    date: slot.date,
    part,
    partLabel: partInfo.label,
    partTime: `${partInfo.start}~${partInfo.end}`,
    amount: data.amount,
    paymentStatus,
    createdAt: data.created_at,
    refundPreview,
  };
}
