import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { bookingMaxDate, kstToday } from '@/lib/policy/booking-window';

/**
 * 예약 가능 기간(오늘~1개월) 내 지정 오픈일(YYYY-MM-DD) 목록 — 고객 달력 노출용.
 * 평소 운영일(금·토) 외에 관리자가 연 날짜.
 */
export async function getBookableOpenDates(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('open_dates')
    .select('date')
    .gte('date', kstToday())
    .lte('date', bookingMaxDate())
    .order('date', { ascending: true });
  return (data ?? []).map((r) => r.date);
}

/**
 * 예약 가능 기간 내 휴무 처리된 날짜(YYYY-MM-DD) 목록 — 고객 달력에서 선택 불가 처리용.
 * 금·토라도 관리자가 닫은 날짜.
 */
export async function getClosedDates(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('closed_dates')
    .select('date')
    .gte('date', kstToday())
    .lte('date', bookingMaxDate())
    .order('date', { ascending: true });
  return (data ?? []).map((r) => r.date);
}
