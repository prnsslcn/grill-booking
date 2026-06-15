import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { kstToday } from '@/lib/policy/booking-window';

export interface OpenDate {
  date: string;
  note: string | null;
}

/** 오늘 이후의 지정 오픈일 목록 — 관리자 화면용. */
export async function listOpenDates(): Promise<OpenDate[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('open_dates')
    .select('date, note')
    .gte('date', kstToday())
    .order('date', { ascending: true });
  return (data ?? []).map((r) => ({ date: r.date, note: r.note }));
}
