/**
 * 클라이언트 결제 헬퍼.
 *  - fake 모드(NEXT_PUBLIC_PAYMENTS_FAKE=1): reserve → confirm 직호출(payAndConfirm).
 *  - real 모드: reserveSlotClient로 예약 선점 후 토스 위젯 requestPayment → success 페이지에서 confirmPaymentClient.
 */

export const PAYMENTS_FAKE = process.env.NEXT_PUBLIC_PAYMENTS_FAKE === '1';

export interface ReserveGuest {
  slotId: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  meat: 'pork' | 'beef';
  addons?: Record<string, number>;
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

/** 슬롯 선점(pending_payment) → orderId·amount 반환. */
export async function reserveSlotClient(
  guest: ReserveGuest,
): Promise<{ orderId: string; amount: number }> {
  const res = await postJson('/api/bookings/reserve', guest);
  const body = (await res.json()) as { orderId?: string; amount?: number; error?: string };
  if (!res.ok) throw new PayError(body.error ?? 'RESERVE_FAILED');
  return { orderId: body.orderId!, amount: body.amount! };
}

/** 결제 승인(서버 재검증). success 페이지/​fake 흐름에서 호출. */
export async function confirmPaymentClient(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<void> {
  const res = await postJson('/api/payments/confirm', input);
  const body = (await res.json()) as { error?: string };
  if (!res.ok) throw new PayError(body.error ?? 'CONFIRM_FAILED');
}

/** fake 모드 전용: 예약 선점 → fake 결제 승인. 성공 시 예약번호 반환. */
export async function payAndConfirm(guest: ReserveGuest): Promise<{ bookingNumber: string }> {
  const { orderId, amount } = await reserveSlotClient(guest);
  await confirmPaymentClient({ paymentKey: `fakepay_${orderId}`, orderId, amount });
  return { bookingNumber: orderId };
}
