import 'server-only';

/**
 * 환불 처리: 토스 취소 성공 → DB 갱신 (순서 엄수).
 *
 * ⚠️ 스켈레톤. 다음 단계 구현.
 *
 * 정합성(schema.md §환불, booking-flow.md §환불):
 *   1. refundRate()/refundAmount()로 환불 금액 계산 (lib/policy/refund.ts, 단일 출처, KST)
 *   2. cancelPayment()로 토스 취소 API 호출 — 성공한 뒤에만 DB 갱신
 *      (DB 먼저 바꾸고 API 실패 시 '돈 안 돌려주고 취소만' 상태 → 금지)
 *   3. 트랜잭션: payments status → cancelled/partial_cancelled,
 *      bookings status → refunded, slots status → 'open' 복구
 *   4. 취소 문자 발송(알림 인터페이스 경유)
 *
 * 관리자(/admin)의 수동 취소도 동일 로직을 사용한다.
 */

export interface RefundInput {
  bookingId: string;
  reason: string;
}

export interface RefundResult {
  bookingId: string;
  refundedAmount: number;
}

export async function refundBooking(_input: RefundInput): Promise<RefundResult> {
  // TODO: 환불액 계산 → cancelPayment() 성공 → 트랜잭션으로 payments/bookings/slots 갱신.
  throw new Error('refundBooking: 미구현 (스켈레톤)');
}
