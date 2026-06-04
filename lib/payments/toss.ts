import 'server-only';

import { serverEnv } from '@/lib/env';
import { PaymentError } from '@/lib/payments/errors';
import { fakeTossClient } from '@/lib/payments/fake';
import type {
  CancelPaymentInput,
  ConfirmPaymentInput,
  TossPaymentResult,
} from '@/lib/payments/types';

/**
 * 토스페이먼츠 서버 API 클라이언트. 시크릿 키는 lib/env.ts 경유(server-only).
 *
 * 교체 가능한 seam: 비프로덕션 + TOSS_FAKE=1 이면 fake 구현체를 사용해
 * 결제 흐름 로직을 결정적으로 검증한다. 실키 연동 시 구현체만 바뀐다.
 */

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

export interface TossClient {
  confirm(input: ConfirmPaymentInput): Promise<TossPaymentResult>;
  cancel(input: CancelPaymentInput): Promise<TossPaymentResult>;
}

/** 시크릿 키로 Basic 인증 헤더 생성 (토스 규격: `secretKey:` base64). */
function authHeader(): string {
  const token = Buffer.from(`${serverEnv.tossSecretKey}:`).toString('base64');
  return `Basic ${token}`;
}

function parseResult(body: Record<string, unknown>): TossPaymentResult {
  return {
    paymentKey: String(body.paymentKey ?? ''),
    orderId: String(body.orderId ?? ''),
    status: String(body.status ?? ''),
    totalAmount: Number(body.totalAmount ?? 0),
    method: body.method != null ? String(body.method) : null,
    approvedAt: body.approvedAt != null ? String(body.approvedAt) : null,
    raw: body,
  };
}

export const realTossClient: TossClient = {
  async confirm(input) {
    const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new PaymentError('TOSS_CONFIRM_FAILED', String(body.message ?? res.status));
    }
    return parseResult(body);
  },

  async cancel(input) {
    const res = await fetch(
      `${TOSS_API_BASE}/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelReason: input.cancelReason,
          ...(input.cancelAmount != null ? { cancelAmount: input.cancelAmount } : {}),
        }),
      },
    );
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new PaymentError('TOSS_CONFIRM_FAILED', String(body.message ?? res.status));
    }
    return parseResult(body);
  },
};

/** 실행 환경에 맞는 토스 클라이언트 반환. 프로덕션은 항상 real. */
export function getTossClient(): TossClient {
  if (process.env.NODE_ENV !== 'production' && process.env.TOSS_FAKE === '1') {
    return fakeTossClient;
  }
  return realTossClient;
}
