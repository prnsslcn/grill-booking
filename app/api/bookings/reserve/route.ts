import { NextResponse } from 'next/server';

import { ReservationError, reservationHttpStatus } from '@/lib/booking/errors';
import { reserveSlot } from '@/lib/booking/reserve';

/**
 * 슬롯 선점 → pending_payment 예약 생성 엔드포인트.
 * 성공 시 booking_number/order_id/amount 반환 → 클라이언트가 토스 결제창 진행(다음 단계).
 *
 * 입력은 서버에서 재검증한다(클라이언트 검증과 별개). 슬롯 가용성·가격은 DB 함수가 권위.
 */

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

interface ReserveBody {
  slotId?: unknown;
  guestName?: unknown;
  guestPhone?: unknown;
  guestCount?: unknown;
}

export async function POST(request: Request) {
  let body: ReserveBody;
  try {
    body = (await request.json()) as ReserveBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  // 입력 검증 (zod 도입은 후속 — 우선 수동 검증)
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : '';
  const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : '';
  const guestPhone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : '';
  const guestCount =
    typeof body.guestCount === 'number' && Number.isInteger(body.guestCount)
      ? body.guestCount
      : 1;

  const fieldErrors: Record<string, string> = {};
  if (!slotId) fieldErrors.slotId = '슬롯을 선택하세요.';
  if (!guestName) fieldErrors.guestName = '예약자명을 입력하세요.';
  if (!PHONE_RE.test(guestPhone)) fieldErrors.guestPhone = '휴대폰 번호 형식이 올바르지 않습니다.';
  if (guestCount < 1) fieldErrors.guestCount = '인원은 1명 이상이어야 합니다.';

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: 'VALIDATION_FAILED', fields: fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await reserveSlot({ slotId, guestName, guestPhone, guestCount });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json(
        { error: error.code },
        { status: reservationHttpStatus(error.code) },
      );
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
