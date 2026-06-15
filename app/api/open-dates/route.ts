import { NextResponse } from 'next/server';

import { getBookableOpenDates } from '@/lib/booking/open-dates';

/** 예약 가능 기간 내 지정 오픈일(금·토 외 운영일) 목록. 고객 달력에서 선택 가능 날짜로 사용. */
export async function GET() {
  const dates = await getBookableOpenDates();
  return NextResponse.json({ dates }, { status: 200 });
}
