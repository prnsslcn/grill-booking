import { NextResponse } from 'next/server';

import { lookupBooking } from '@/lib/booking/lookup';
import { RefundError, refundBooking, refundHttpStatus } from '@/lib/booking/refund';

/**
 * 고객 예약 취소(환불). 예약번호 + 연락처로 소유 검증 후 환불 처리.
 * 관리자 취소는 같은 refundBooking을 인증 보호된 경로에서 재사용(관리자 페이지 단계).
 */

interface CancelBody {
  bookingNumber?: unknown;
  phone?: unknown;
  reason?: unknown;
}

export async function POST(request: Request) {
  let body: CancelBody;
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const bookingNumber =
    typeof body.bookingNumber === 'string' ? body.bookingNumber.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const reason =
    typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : '고객 취소';

  if (!bookingNumber || !phone) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  // 소유 검증 — 불일치/미존재는 동일 404(열거 공격 방지)
  const found = await lookupBooking({ bookingNumber, phone });
  if (!found) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  try {
    const result = await refundBooking({ bookingNumber, reason });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.code }, { status: refundHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
