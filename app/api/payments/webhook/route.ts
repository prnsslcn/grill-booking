import { NextResponse } from 'next/server';

/**
 * 토스페이먼츠 웹훅 수신 엔드포인트.
 *
 * ⚠️ 스켈레톤. 결제 상태 변경(가상계좌 입금, 취소 등) 비동기 통지 수신.
 * 구현 시: 서명/출처 검증 → 이벤트 타입별 처리(멱등) → DB 정합성 유지.
 * 콜백(confirm)과 별개로, 이탈/지연 결제의 최종 정합성 보정 경로.
 */
export async function POST(request: Request) {
  // TODO: 토스 웹훅 서명 검증 후 이벤트 처리. 현재는 수신만 ack.
  void request;
  return NextResponse.json({ received: true });
}
