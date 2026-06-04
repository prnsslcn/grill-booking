import { NextResponse } from 'next/server';

import { lookupBooking } from '@/lib/booking/lookup';

/**
 * 예약 조회 — 예약번호 + 연락처로 본인 예약 확인(비회원).
 * POST를 쓴다(연락처를 URL/접근로그에 남기지 않기 위해).
 * 불일치/미존재는 동일한 404 NOT_FOUND(열거 공격 방지).
 */

interface LookupBody {
  bookingNumber?: unknown;
  phone?: unknown;
}

export async function POST(request: Request) {
  let body: LookupBody;
  try {
    body = (await request.json()) as LookupBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const bookingNumber =
    typeof body.bookingNumber === 'string' ? body.bookingNumber.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!bookingNumber || !phone) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const result = await lookupBooking({ bookingNumber, phone });
  if (!result) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
}
