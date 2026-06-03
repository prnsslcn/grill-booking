import { NextResponse } from 'next/server';

import { confirmBooking } from '@/lib/booking/confirm';
import type { ConfirmPaymentInput } from '@/lib/payments/types';

/**
 * 토스 결제창 성공 콜백 → 서버 결제 승인 재검증 진입점.
 *
 * ⚠️ 스켈레톤. 결제-예약 정합성의 핵심 위치.
 * 흐름: 입력(paymentKey/orderId/amount) 파싱 → confirmBooking()이 토스 재검증 + 트랜잭션 처리.
 * 클라이언트 응답만 믿고 확정하지 않는다.
 */
export async function POST(request: Request) {
  // TODO: 입력 검증(zod 등), 에러 매핑, 멱등 처리.
  const input = (await request.json()) as ConfirmPaymentInput;

  try {
    const result = await confirmBooking(input);
    return NextResponse.json(result);
  } catch (error) {
    // 스켈레톤: 미구현 에러 포함. 실제 구현 시 상태코드·메시지 정교화.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown' },
      { status: 501 },
    );
  }
}
