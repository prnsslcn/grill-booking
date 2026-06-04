import 'server-only';

import { noopSender } from '@/lib/notifications';
import { refundAmount } from '@/lib/policy/refund';
import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * 환불 처리: 토스 취소 성공 → DB 갱신 (순서 엄수).
 *
 * 정합성(schema.md §환불, booking-flow.md §환불):
 *   1. request_cancel_tx: 예약 잠금 → cancel_requested 전이 → 결제키·금액·이용일 반환
 *   2. refundAmount(): 환불액 계산(lib/policy/refund.ts, 단일 출처, KST)
 *   3. 환불액>0이면 토스 취소 — 성공 후에만 DB 확정(실패 시 cancel_requested로 남아 재시도)
 *   4. finalize_refund_tx: payments cancelled/partial + booking refunded + slot open
 *   5. 취소 알림(인터페이스 경유, best-effort)
 *
 * 고객 취소(조회 경유)와 관리자 취소가 이 함수를 공유한다.
 */

export type RefundErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'NOT_CANCELLABLE'
  | 'ALREADY_REFUNDED'
  | 'TOSS_CANCEL_FAILED'
  | 'NO_PAYMENT'
  | 'UNKNOWN';

const KNOWN_CODES: RefundErrorCode[] = [
  'BOOKING_NOT_FOUND',
  'NOT_CANCELLABLE',
  'ALREADY_REFUNDED',
  'TOSS_CANCEL_FAILED',
  'NO_PAYMENT',
];

export class RefundError extends Error {
  readonly code: RefundErrorCode;
  constructor(code: RefundErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RefundError';
    this.code = code;
  }
}

function toRefundError(error: unknown): RefundError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const matched = KNOWN_CODES.find((code) => message.includes(code));
  return new RefundError(matched ?? 'UNKNOWN', message);
}

export function refundHttpStatus(code: RefundErrorCode): number {
  switch (code) {
    case 'ALREADY_REFUNDED':
      return 200;
    case 'BOOKING_NOT_FOUND':
      return 404;
    case 'NOT_CANCELLABLE':
      return 409;
    case 'NO_PAYMENT':
      return 409;
    case 'TOSS_CANCEL_FAILED':
      return 502;
    default:
      return 500;
  }
}

export interface RefundInput {
  bookingNumber: string;
  reason: string;
}

export interface RefundResult {
  bookingId: string;
  refundedAmount: number;
  outcome: 'REFUNDED' | 'ALREADY_REFUNDED';
}

export async function refundBooking(
  input: RefundInput,
  toss: TossClient = getTossClient(),
): Promise<RefundResult> {
  const supabase = createAdminClient();

  // 1) 취소 요청(잠금 + cancel_requested)
  const { data: reqData, error: reqError } = await supabase.rpc('request_cancel_tx', {
    p_order_id: input.bookingNumber,
  });
  if (reqError) throw toRefundError(reqError);

  const req = Array.isArray(reqData) ? reqData[0] : reqData;
  if (!req) throw new RefundError('UNKNOWN', '취소 요청 결과가 비어 있습니다.');

  if (req.outcome === 'ALREADY_REFUNDED') {
    return { bookingId: req.booking_id, refundedAmount: 0, outcome: 'ALREADY_REFUNDED' };
  }

  // 2) 환불액 계산(서버, KST)
  const paid = req.paid_amount ?? 0;
  const refund = refundAmount(paid, req.slot_date, new Date());
  const isPartial = refund > 0 && refund < paid;

  // 3) 환불액>0이면 토스 취소 — 성공 후에만 DB 확정
  let didTossCancel = false;
  let raw: Json = { refunded: 0 } as Json;
  if (refund > 0) {
    if (!req.payment_key) {
      throw new RefundError('NO_PAYMENT', '취소할 결제 키가 없습니다.');
    }
    try {
      const result = await toss.cancel({
        paymentKey: req.payment_key,
        cancelReason: input.reason,
        ...(isPartial ? { cancelAmount: refund } : {}),
      });
      didTossCancel = true;
      raw = result.raw as Json;
    } catch (error) {
      // 예약은 cancel_requested로 남아 재시도 가능(돈 안 돌려주고 취소 방지)
      throw new RefundError('TOSS_CANCEL_FAILED', String(error));
    }
  }

  // 4) 환불 확정
  const { data: finData, error: finError } = await supabase.rpc('finalize_refund_tx', {
    p_booking_id: req.booking_id,
    p_refund_amount: refund,
    p_is_partial: isPartial,
    p_did_toss_cancel: didTossCancel,
    p_raw: raw,
  });
  if (finError) throw toRefundError(finError);

  const fin = Array.isArray(finData) ? finData[0] : finData;

  // 5) 취소 알림(best-effort)
  await notifyCancelled(supabase, req.booking_id, input.bookingNumber);

  return {
    bookingId: req.booking_id,
    refundedAmount: fin?.refunded_amount ?? refund,
    outcome: 'REFUNDED',
  };
}

async function notifyCancelled(
  supabase: AdminClient,
  bookingId: string,
  bookingNumber: string,
): Promise<void> {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('guest_phone')
      .eq('id', bookingId)
      .maybeSingle();

    const result = await noopSender.send({
      bookingId,
      to: booking?.guest_phone ?? '',
      type: 'cancel',
      channel: 'sms',
      payload: { bookingNumber },
    });

    await supabase.from('notifications').insert({
      booking_id: bookingId,
      type: 'cancel',
      channel: 'sms',
      status: result.status,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      payload: { bookingNumber } as Json,
    });
  } catch {
    // best-effort
  }
}
