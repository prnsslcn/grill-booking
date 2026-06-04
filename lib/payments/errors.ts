/**
 * 결제 도메인 에러 — confirm_booking_tx가 RAISE한 메시지/토스 실패를 타입화.
 */

export type PaymentErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_NOT_PENDING' // 취소·만료 회수된 예약(보상 환불 대상)
  | 'AMOUNT_MISMATCH' // 토스 승인액 ≠ 예약 금액(보상 환불 대상)
  | 'TOSS_CONFIRM_FAILED' // 토스 승인 API 자체 실패
  | 'ALREADY_CONFIRMED' // 멱등(이미 확정) — 에러 아님, 200 처리
  | 'UNKNOWN';

const KNOWN_CODES: PaymentErrorCode[] = [
  'BOOKING_NOT_FOUND',
  'BOOKING_NOT_PENDING',
  'AMOUNT_MISMATCH',
  'TOSS_CONFIRM_FAILED',
  'ALREADY_CONFIRMED',
];

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  constructor(code: PaymentErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PaymentError';
    this.code = code;
  }
}

/** DB RPC 에러 메시지에서 알려진 코드를 추출. */
export function toPaymentError(error: unknown): PaymentError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const matched = KNOWN_CODES.find((code) => message.includes(code));
  return new PaymentError(matched ?? 'UNKNOWN', message);
}

/** 보상 환불(토스 취소)이 필요한 코드인지. */
export function needsCompensation(code: PaymentErrorCode): boolean {
  return code === 'AMOUNT_MISMATCH' || code === 'BOOKING_NOT_PENDING';
}

/** 결제 에러 코드 → HTTP 상태코드. ALREADY_CONFIRMED는 멱등 성공(200). */
export function paymentHttpStatus(code: PaymentErrorCode): number {
  switch (code) {
    case 'ALREADY_CONFIRMED':
      return 200;
    case 'BOOKING_NOT_FOUND':
      return 404;
    case 'BOOKING_NOT_PENDING':
      return 409;
    case 'AMOUNT_MISMATCH':
      return 422;
    case 'TOSS_CONFIRM_FAILED':
      return 502;
    default:
      return 500;
  }
}
