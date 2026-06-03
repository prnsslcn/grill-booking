import 'server-only';

/**
 * 슬롯 선점 → pending_payment 예약 생성 (트랜잭션).
 *
 * ⚠️ 스켈레톤. 다음 단계에서 Postgres 함수(RPC) 또는 트랜잭션으로 구현한다.
 *
 * 정합성 순서(schema.md §동시성):
 *   1. 트랜잭션 시작
 *   2. 대상 slot을 `SELECT ... FOR UPDATE`로 잠금, status='open' 확인
 *   3. bookings를 pending_payment로 INSERT (slot_id UNIQUE가 최종 방어선)
 *   4. slots.status를 'booked'로 변경
 *   5. 커밋 → 호출 측에서 토스 결제창 진행
 *
 * 동시에 두 요청이 와도 slot_id UNIQUE 제약 덕분에 하나만 성공한다.
 * service_role(admin 클라이언트)로 실행 — RLS 우회는 서버 라우트에 한정.
 */

export interface ReserveInput {
  slotId: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
}

export interface ReserveResult {
  bookingId: string;
  bookingNumber: string;
  orderId: string;
  amount: number;
}

export async function reserveSlot(_input: ReserveInput): Promise<ReserveResult> {
  // TODO: createAdminClient()로 RPC(예: reserve_slot) 호출.
  //       슬롯 잠금·상태확인·예약생성·슬롯상태변경을 단일 트랜잭션으로.
  throw new Error('reserveSlot: 미구현 (스켈레톤)');
}
