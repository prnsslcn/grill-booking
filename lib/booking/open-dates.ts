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
