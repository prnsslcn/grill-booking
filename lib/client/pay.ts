/**
 * 클라이언트 결제 seam.
 *  - fake 모드(NEXT_PUBLIC_PAYMENTS_FAKE=1): reserve → confirm 직호출로 결제 시뮬레이션.
 *  - real 모드(추후): reserve → 토스 결제위젯 → success redirect → confirm.
 * 실키 연동 시 real 분기만 채우면 화면 흐름은 그대로 유지된다.
 */

const FAKE = process.env.NEXT_PUBLIC_PAYMENTS_FAKE === '1';

export interface ReserveGuest {
  slotId: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
}

export class PayError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 예약 선점 → 결제 → 확정. 성공 시 예약번호 반환. */
export async function payAndConfirm(guest: ReserveGuest): Promise<{ bookingNumber: string }> {
  // 1) 슬롯 선점(pending_payment)
  const reserveRes = await postJson('/api/bookings/reserve', guest);
  const reserveBody = (await reserveRes.json()) as {
    orderId?: string;
    amount?: number;
    error?: string;
  };
  if (!reserveRes.ok) {
    throw new PayError(reserveBody.error ?? 'RESERVE_FAILED');
  }
  const orderId = reserveBody.orderId!;
  const amount = reserveBody.amount!;

  if (!FAKE) {
    // TODO(실키): 토스 결제위젯 호출 → success 페이지에서 confirm.
    throw new PayError('NOT_IMPLEMENTED', '실제 토스 결제는 키 연동 후 제공됩니다.');
  }

  // 2) fake 결제 승인(confirm). 서버 TOSS_FAKE=1이 fake 토스 클라이언트로 검증.
  const confirmRes = await postJson('/api/payments/confirm', {
    paymentKey: `fakepay_${orderId}`,
    orderId,
    amount,
  });
  const confirmBody = (await confirmRes.json()) as { error?: string };
  if (!confirmRes.ok) {
    throw new PayError(confirmBody.error ?? 'CONFIRM_FAILED');
  }

  return { bookingNumber: orderId };
}
