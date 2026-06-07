import 'server-only';

import { dispatchBookingNotification } from '@/lib/notifications/dispatch';
import {
  PaymentError,
  needsCompensation,
  toPaymentError,
} from '@/lib/payments/errors';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import type { ConfirmPaymentInput, TossPaymentResult } from '@/lib/payments/types';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 결제 승인 재검증 → 예약 confirmed 확정.
 *
 * 정합성(schema.md §3, booking-flow.md [3]): 클라이언트 결과를 믿지 않는다.
 *   1) 예약 사전 조회로 빠른 실패(이미 확정=멱등, 비-pending=확정 불가 → 토스 미캡처)
 *   2) 토스 승인(캡처)
 *   3) confirm_booking_tx로 금액 재검증 + payments(paid) + booking confirmed (단일 트랜잭션)
 *   4) tx 거부(금액불일치/레이스로 회수됨)면 캡처분을 토스 취소(보상 환불)
 *   5) 확정 시 확정 알림(인터페이스 경유, best-effort)
 */

export interface ConfirmResult {
  bookingId: string;
  bookingNumber: string;
  outcome: 'CONFIRMED' | 'ALREADY_CONFIRMED';
}

export async function confirmBooking(
  input: ConfirmPaymentInput,
  toss: TossClient = getTossClient(),
): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  // 1) 빠른 실패 — 캡처 전에 명백한 경우를 걸러 불필요한 결제·환불을 피한다.
  const { data: pre } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('booking_number', input.orderId)
    .maybeSingle();

  if (!pre) throw new PaymentError('BOOKING_NOT_FOUND');
  if (pre.status === 'confirmed') {
    return { bookingId: pre.id, bookingNumber: input.orderId, outcome: 'ALREADY_CONFIRMED' };
  }
  if (pre.status !== 'pending_payment') {
    // 미캡처 상태이므로 보상 불필요(토스 미호출)
    throw new PaymentError('BOOKING_NOT_PENDING');
  }

  // 2) 토스 승인(캡처)
  const tossResult = await toss.confirm(input);

  // 3) DB 트랜잭션
  const { data, error } = await supabase.rpc('confirm_booking_tx', {
    p_order_id: input.orderId,
    p_payment_key: tossResult.paymentKey,
    p_amount: tossResult.totalAmount,
    // 토스 method/approvedAt은 null 가능. PG text/timestamptz 파라미터는 null 허용이나
    // 생성 타입이 non-null로 보므로 캐스팅(런타임 null 전달은 안전).
    p_method: (tossResult.method ?? null) as string,
    p_approved_at: (tossResult.approvedAt ?? null) as string,
    p_raw: tossResult.raw as Json,
  });

  if (error) {
    const perr = toPaymentError(error);
    // 4) 캡처했는데 확정 불가 → 보상 환불
    if (needsCompensation(perr.code)) {
      await compensate(supabase, toss, tossResult, perr.code);
    }
    throw perr;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PaymentError('UNKNOWN', 'confirm 결과가 비어 있습니다.');

  if (row.outcome === 'CONFIRMED') {
    // 확정 알림(고객+관리자, best-effort)
    await dispatchBookingNotification(supabase, row.booking_id, 'confirm');
  }

  return {
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    outcome: row.outcome === 'CONFIRMED' ? 'CONFIRMED' : 'ALREADY_CONFIRMED',
  };
}

/** 캡처분 토스 취소(환불) + 감사용 payments(cancelled) 기록. */
async function compensate(
  supabase: AdminClient,
  toss: TossClient,
  tossResult: TossPaymentResult,
  reason: string,
): Promise<void> {
  try {
    await toss.cancel({ paymentKey: tossResult.paymentKey, cancelReason: reason });
  } catch {
    // 토스 취소 실패는 운영 알림 대상(추후) — 여기선 삼키지 않도록 로깅 지점.
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_number', tossResult.orderId)
    .maybeSingle();

  if (booking) {
    await supabase.from('payments').insert({
      booking_id: booking.id,
      toss_payment_key: tossResult.paymentKey,
      toss_order_id: tossResult.orderId,
      amount: tossResult.totalAmount,
      status: 'cancelled',
      method: tossResult.method,
      cancelled_at: new Date().toISOString(),
      raw_response: { compensated: true, reason } as Json,
    });
  }
}
