import 'server-only';

import { serverEnv } from '@/lib/env';
import type {
  CancelPaymentInput,
  ConfirmPaymentInput,
  TossPaymentResult,
} from '@/lib/payments/types';

/**
 * 토스페이먼츠 서버 API 래퍼. 시크릿 키는 lib/env.ts 경유(server-only).
 *
 * ⚠️ 스켈레톤: 실제 HTTP 호출은 다음 단계에서 구현한다.
 * 결제 승인/취소는 반드시 서버에서만 호출하며, 응답을 신뢰하기 전 금액·주문ID를 재검증한다.
 */

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

/** 시크릿 키로 Basic 인증 헤더 생성 (토스 규격: `secretKey:` base64). */
function authHeader(): string {
  const token = Buffer.from(`${serverEnv.tossSecretKey}:`).toString('base64');
  return `Basic ${token}`;
}

/**
 * 결제 승인. 토스 `/payments/confirm` 호출 → 승인 결과 반환.
 * 호출 측(confirm 트랜잭션)에서 result.totalAmount === booking.amount 를 재검증해야 한다.
 */
export async function confirmPayment(
  _input: ConfirmPaymentInput,
): Promise<TossPaymentResult> {
  // TODO: POST `${TOSS_API_BASE}/payments/confirm` { paymentKey, orderId, amount }
  //       헤더 Authorization: authHeader(), Content-Type: application/json
  //       실패 응답(4xx/5xx) 시 에러 throw → 예약 confirmed 전이 금지.
  void TOSS_API_BASE;
  void authHeader;
  throw new Error('confirmPayment: 미구현 (스켈레톤)');
}

/**
 * 결제 취소(환불). 토스 `/payments/{paymentKey}/cancel` 호출.
 * 정합성: 이 호출이 성공한 뒤에만 DB 상태를 refunded/partial로 갱신한다.
 */
export async function cancelPayment(
  _input: CancelPaymentInput,
): Promise<TossPaymentResult> {
  // TODO: POST `${TOSS_API_BASE}/payments/${paymentKey}/cancel` { cancelReason, cancelAmount? }
  throw new Error('cancelPayment: 미구현 (스켈레톤)');
}
