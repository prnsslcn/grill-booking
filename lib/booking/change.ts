import 'server-only';

import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/**
 * 고객 예약 변경(Stage 1): 동일가/다운그레이드만 즉시 처리.
 *   1. change_booking_apply_tx: 본인확인·2일규칙·슬롯교체·금액 재계산(원자적)
 *   2. 다운그레이드(delta<0)면 토스 부분취소로 차액 환불 → change_settle_refund로 원장 반영
 *   3. 업그레이드(delta>0)는 RPC가 UPGRADE_REQUIRES_PAYMENT를 던짐 → Stage 2(추가결제)에서 처리
 */

export type ChangeErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'NOT_CHANGEABLE'
  | 'CHANGE_WINDOW_CLOSED'
  | 'SLOT_NOT_FOUND'
  | 'SLOT_CLOSED'
  | 'SLOT_TAKEN'
  | 'AMOUNT_CHANGED'
  | 'INVALID_ADDON'
  | 'UPGRADE_REQUIRES_PAYMENT'
  | 'TOSS_CANCEL_FAILED'
  | 'UNKNOWN';

const KNOWN_CODES: ChangeErrorCode[] = [
  'BOOKING_NOT_FOUND',
  'NOT_CHANGEABLE',
  'CHANGE_WINDOW_CLOSED',
  'SLOT_NOT_FOUND',
  'SLOT_CLOSED',
  'SLOT_TAKEN',
  'AMOUNT_CHANGED',
  'INVALID_ADDON',
  'UPGRADE_REQUIRES_PAYMENT',
  'TOSS_CANCEL_FAILED',
];

export class ChangeError extends Error {
  readonly code: ChangeErrorCode;
  constructor(code: ChangeErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ChangeError';
    this.code = code;
  }
}

function toChangeError(error: unknown): ChangeError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const matched = KNOWN_CODES.find((c) => message.includes(c));
  return new ChangeError(matched ?? 'UNKNOWN', message);
}

export function changeHttpStatus(code: ChangeErrorCode): number {
  switch (code) {
    case 'BOOKING_NOT_FOUND':
      return 404;
    case 'NOT_CHANGEABLE':
    case 'CHANGE_WINDOW_CLOSED':
    case 'SLOT_TAKEN':
    case 'SLOT_CLOSED':
    case 'AMOUNT_CHANGED':
    case 'UPGRADE_REQUIRES_PAYMENT':
      return 409;
    case 'TOSS_CANCEL_FAILED':
      return 502;
    default:
      return 500;
  }
}

export interface ChangeInput {
  bookingNumber: string;
  phone: string;
  newSlotId: string;
  guestCount: number;
  meat: 'pork' | 'beef';
  addons: Record<string, number>;
  expectedAmount: number;
}

export interface ChangeResult {
  outcome: 'CHANGED';
  delta: number;
  newAmount: number;
  refunded: number;
}

export async function changeBooking(
  input: ChangeInput,
  toss: TossClient = getTossClient(),
): Promise<ChangeResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('change_booking_apply_tx', {
    p_booking_number: input.bookingNumber,
    p_phone: input.phone,
    p_new_slot_id: input.newSlotId,
    p_guest_count: input.guestCount,
    p_meat: input.meat,
    p_addons: input.addons as unknown as Json,
    p_expected_amount: input.expectedAmount,
  });
  if (error) throw toChangeError(error);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new ChangeError('UNKNOWN', '변경 결과가 비어 있습니다.');

  let refunded = 0;
  // 다운그레이드: 차액을 토스 부분취소로 환불 → 원장(payments.amount) 새 금액으로 조정
  if (row.delta < 0) {
    const refundAmt = -row.delta;
    if (!row.payment_key) {
      throw new ChangeError('TOSS_CANCEL_FAILED', '환불할 결제 키가 없습니다.');
    }
    let raw: Json = { partialCancel: refundAmt } as Json;
    try {
      const result = await toss.cancel({
        paymentKey: row.payment_key,
        cancelReason: '예약 변경 차액 환불',
        cancelAmount: refundAmt,
      });
      raw = result.raw as Json;
    } catch (e) {
      // 슬롯/예약은 이미 변경됨 → 환불만 실패. 재시도·수동 정산 대상.
      throw new ChangeError('TOSS_CANCEL_FAILED', String(e));
    }
    refunded = refundAmt;
    await supabase.rpc('change_settle_refund', {
      p_booking_id: row.booking_id,
      p_new_amount: row.new_amount,
      p_raw: raw,
    });
  }

  return { outcome: 'CHANGED', delta: row.delta, newAmount: row.new_amount, refunded };
}
