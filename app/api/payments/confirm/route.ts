import { NextResponse } from 'next/server';

import { confirmBooking } from '@/lib/booking/confirm';
import { PaymentError, paymentHttpStatus } from '@/lib/payments/errors';

/**
 * 토스 결제창 성공 콜백 → 서버 결제 승인 재검증 진입점.
 * 결제-예약 정합성의 핵심. 클라이언트 응답만 믿고 확정하지 않는다(서버가 토스 재검증).
 */

interface ConfirmBody {
  paymentKey?: unknown;
  orderId?: unknown;
  amount?: unknown;
}

export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey.trim() : '';
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const amount =
    typeof body.amount === 'number' && Number.isInteger(body.amount) ? body.amount : NaN;

  if (!paymentKey || !orderId || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  try {
    const result = await confirmBooking({ paymentKey, orderId, amount });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PaymentError) {
      // ALREADY_CONFIRMED는 멱등 성공(200)으로 다룬다.
      if (error.code === 'ALREADY_CONFIRMED') {
        return NextResponse.json({ outcome: 'ALREADY_CONFIRMED' }, { status: 200 });
      }
      return NextResponse.json({ error: error.code }, { status: paymentHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
