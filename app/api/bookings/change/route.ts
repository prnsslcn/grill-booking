import { NextResponse } from 'next/server';

import { ChangeError, changeBooking, changeHttpStatus } from '@/lib/booking/change';
import { BEEF_ENABLED, isBeefAddonKey } from '@/lib/config';

/**
 * 고객 예약 변경(Stage 1: 동일가·다운그레이드). 본인확인·금액 재검증은 서버(RPC)가 권위.
 * 업그레이드는 UPGRADE_REQUIRES_PAYMENT로 반환 → 클라이언트가 Stage 2(추가결제)로 유도.
 */

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

interface Body {
  bookingNumber?: unknown;
  phone?: unknown;
  newSlotId?: unknown;
  guestCount?: unknown;
  meat?: unknown;
  addons?: unknown;
  expectedAmount?: unknown;
}

function parseAddons(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isInteger(v) && v > 0) out[k] = v;
    }
  }
  return out;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const bookingNumber = typeof body.bookingNumber === 'string' ? body.bookingNumber.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const newSlotId = typeof body.newSlotId === 'string' ? body.newSlotId.trim() : '';
  const guestCount =
    typeof body.guestCount === 'number' && Number.isInteger(body.guestCount) ? body.guestCount : 1;
  let meat = body.meat === 'pork' || body.meat === 'beef' ? body.meat : '';
  if (meat === 'beef' && !BEEF_ENABLED) meat = '';
  const rawAddons = parseAddons(body.addons);
  const addons = BEEF_ENABLED
    ? rawAddons
    : Object.fromEntries(Object.entries(rawAddons).filter(([k]) => !isBeefAddonKey(k)));
  const expectedAmount =
    typeof body.expectedAmount === 'number' && Number.isInteger(body.expectedAmount)
      ? body.expectedAmount
      : -1;

  const fields: Record<string, string> = {};
  if (!bookingNumber) fields.bookingNumber = '예약번호를 입력하세요.';
  if (!PHONE_RE.test(phone)) fields.phone = '휴대폰 번호 형식이 올바르지 않습니다.';
  if (!newSlotId) fields.newSlotId = '변경할 슬롯을 선택하세요.';
  if (!meat) fields.meat = '고기 종류를 선택하세요.';
  if (guestCount < 1) fields.guestCount = '인원은 1명 이상이어야 합니다.';
  if (expectedAmount < 0) fields.expectedAmount = '금액이 올바르지 않습니다.';
  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: 'VALIDATION_FAILED', fields }, { status: 400 });
  }

  try {
    const result = await changeBooking({
      bookingNumber,
      phone,
      newSlotId,
      guestCount,
      meat: meat as 'pork' | 'beef',
      addons,
      expectedAmount,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ChangeError) {
      return NextResponse.json({ error: error.code }, { status: changeHttpStatus(error.code) });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
