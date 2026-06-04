import 'server-only';

import type { TossClient } from '@/lib/payments/toss';
import type { TossPaymentResult } from '@/lib/payments/types';

/**
 * 결제 흐름 검증용 fake 토스 클라이언트. 비프로덕션 + TOSS_FAKE=1에서만 사용.
 *
 * - confirm: 요청 금액을 그대로 totalAmount로 에코한다.
 *   → 금액 불일치 분기는 호출 측이 '예약 금액과 다른 amount'를 보내 유도(클라이언트 위변조 시뮬레이션).
 * - cancel: 보상 환불 호출을 모듈 메모리에 기록(테스트가 호출 여부 확인 가능).
 * 결정적이라 헤드리스 e2e가 가능하다.
 */

export const fakeCancelLog: Array<{ paymentKey: string; reason: string }> = [];

export const fakeTossClient: TossClient = {
  async confirm(input): Promise<TossPaymentResult> {
    return {
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      status: 'DONE',
      totalAmount: input.amount,
      method: '간편결제',
      approvedAt: '2026-01-01T00:00:00+09:00',
      raw: { fake: true, ...input },
    };
  },

  async cancel(input): Promise<TossPaymentResult> {
    fakeCancelLog.push({ paymentKey: input.paymentKey, reason: input.cancelReason });
    return {
      paymentKey: input.paymentKey,
      orderId: '',
      status: 'CANCELED',
      totalAmount: input.cancelAmount ?? 0,
      method: null,
      approvedAt: null,
      raw: { fake: true, canceled: true, ...input },
    };
  },
};
