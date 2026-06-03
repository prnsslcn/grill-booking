import 'server-only';

import type { ConfirmPaymentInput } from '@/lib/payments/types';

/**
 * 결제 승인 재검증 → 예약 confirmed 확정 (단일 트랜잭션).
 *
 * ⚠️ 스켈레톤. 다음 단계 구현.
 *
 * 정합성(schema.md §3, booking-flow.md [3]):
 *   1. confirmPayment()로 토스 승인 API 호출(서버)
 *   2. 응답 totalAmount === bookings.amount, orderId 일치 재검증 (불일치 시 중단)
 *   3. 트랜잭션: payments INSERT(paid) + bookings status → confirmed
 *   4. 확정 문자 발송(알림 인터페이스 경유)
 *
 * 클라이언트가 보낸 결제 결과만 믿고 확정하지 않는다 — 반드시 서버 재검증.
 */

export interface ConfirmResult {
  bookingId: string;
  bookingNumber: string;
}

export async function confirmBooking(
  _input: ConfirmPaymentInput,
): Promise<ConfirmResult> {
  // TODO: confirmPayment() 호출 → 금액/주문ID 재검증 → 트랜잭션으로 payments+bookings 갱신.
  throw new Error('confirmBooking: 미구현 (스켈레톤)');
}
