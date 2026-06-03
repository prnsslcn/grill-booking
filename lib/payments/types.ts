/**
 * 토스페이먼츠 연동 타입. (구현은 lib/payments/toss.ts)
 */

/** 결제 승인 요청 — 클라이언트 결제창 성공 콜백에서 서버로 전달되는 값. */
export interface ConfirmPaymentInput {
  paymentKey: string;
  orderId: string;
  /** 클라이언트가 보낸 금액. 서버에서 bookings.amount와 반드시 재검증한다. */
  amount: number;
}

/** 토스 결제 승인 응답(필요한 필드만 추림). raw는 payments.raw_response에 보관. */
export interface TossPaymentResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string | null;
  approvedAt: string | null;
  raw: unknown;
}

/** 결제 취소(환불) 요청. */
export interface CancelPaymentInput {
  paymentKey: string;
  cancelReason: string;
  /** 부분 취소 금액(원). 미지정 시 전액 취소. */
  cancelAmount?: number;
}
