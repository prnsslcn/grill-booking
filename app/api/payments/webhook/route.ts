import { NextResponse } from 'next/server';

import { syncPaymentFromWebhook } from '@/lib/booking/webhook';

/**
 * 토스페이먼츠 웹훅 수신 엔드포인트(안전망).
 *
 * 일반 결제 웹훅에는 서명 헤더가 없으므로 본문을 신뢰하지 않는다. eventType만 보고
 * paymentKey를 꺼내, 실제 검증·동기화는 토스 API 재조회(syncPaymentFromWebhook)에 맡긴다.
 *
 * 외부 취소(대시보드 직접취소·망취소 등)를 우리 DB에 반영하는 비동기 보정 경로.
 * 정상 결제 확정은 여전히 confirm(동기)이 담당한다.
 *
 * 응답: 항상 200. 토스는 비200이면 최대 7회 재전송하는데, 처리는 멱등하므로
 * 일시 실패는 다음 웹훅/수동 대응으로 커버하고 재전송 폭주를 피한다.
 */
export async function POST(request: Request) {
  let body: { eventType?: string; data?: { paymentKey?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    if (body.eventType === 'PAYMENT_STATUS_CHANGED') {
      const paymentKey = body.data?.paymentKey;
      if (typeof paymentKey === 'string' && paymentKey) {
        await syncPaymentFromWebhook(paymentKey);
      }
    }
  } catch {
    // 동기화 실패는 삼키되(200 유지) 운영 로깅 지점. 멱등이라 재처리 안전.
  }

  return NextResponse.json({ received: true });
}
