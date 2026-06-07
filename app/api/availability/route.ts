import { NextResponse } from 'next/server';

import { getAddons, getAvailability } from '@/lib/booking/availability';

/**
 * 날짜별 예약 가능 현황. GET ?date=YYYY-MM-DD.
 * 운영일(금·토)이 아니거나 슬롯이 없으면 각 부 available=false.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  const [availability, addons] = await Promise.all([getAvailability(date), getAddons()]);
  return NextResponse.json({ date, availability, addons }, { status: 200 });
}
