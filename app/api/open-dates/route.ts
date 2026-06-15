import { NextResponse } from 'next/server';

import { getBookableOpenDates, getClosedDates } from '@/lib/booking/open-dates';

/**
 * 고객 달력용 운영일 정보.
 * - dates: 지정 오픈일(금·토 외 추가 운영일) → 선택 가능
 * - closedDates: 휴무 처리된 날짜(금·토라도 닫힘) → 선택 불가
 */
export async function GET() {
  const [dates, closedDates] = await Promise.all([getBookableOpenDates(), getClosedDates()]);
  return NextResponse.json({ dates, closedDates }, { status: 200 });
}
