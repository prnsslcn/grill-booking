import 'server-only';

import { isHiddenFacilityType } from '@/lib/facilities';
import { createAdminClient } from '@/lib/supabase/admin';

export interface BoardFacility {
  type: string;
  name: string;
  totalUnits: number;
  capacity: number;
}

export interface MonthBoard {
  facilities: BoardFacility[];
  openDates: string[]; // 해당 월의 지정 오픈일
  closedDates: string[]; // 해당 월의 휴무일
  /** counts[date][part][facilityType] = 예약된(booked) 동 수 */
  counts: Record<string, Record<number, Record<string, number>>>;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * 특정 월(연·0-based 월)의 예약현황 보드.
 * 예약 점유 = slots.status='booked' (reserve/admin_create가 booked로, 취소·만료가 open으로 되돌림).
 */
export async function getMonthBoard(year: number, month0: number): Promise<MonthBoard> {
  const supabase = createAdminClient();
  const start = `${year}-${pad(month0 + 1)}-01`;
  const end = `${year}-${pad(month0 + 1)}-${pad(new Date(year, month0 + 1, 0).getDate())}`;

  const [{ data: facs }, { data: rows }, { data: opens }, { data: closes }] = await Promise.all([
    supabase
      .from('facilities')
      .select('type, name, total_units, capacity')
      .eq('is_active', true)
      .order('capacity', { ascending: true }),
    supabase
      .from('slots')
      .select('date, part, facility_units!inner(facilities!inner(type))')
      .eq('status', 'booked')
      .gte('date', start)
      .lte('date', end),
    supabase.from('open_dates').select('date').gte('date', start).lte('date', end),
    supabase.from('closed_dates').select('date').gte('date', start).lte('date', end),
  ]);

  const counts: MonthBoard['counts'] = {};
  for (const r of rows ?? []) {
    const type = r.facility_units?.facilities?.type;
    if (!r.date || !r.part || !type) continue;
    (counts[r.date] ??= {})[r.part] ??= {};
    counts[r.date][r.part][type] = (counts[r.date][r.part][type] ?? 0) + 1;
  }

  return {
    // 판매 중단(숨김) 시설은 보드·유선예약 폼에서 제외(기존 예약은 리스트에서 계속 조회됨)
    facilities: (facs ?? [])
      .filter((f) => !isHiddenFacilityType(f.type))
      .map((f) => ({
        type: f.type,
        name: f.name,
        totalUnits: f.total_units,
        capacity: f.capacity,
      })),
    openDates: (opens ?? []).map((o) => o.date),
    closedDates: (closes ?? []).map((c) => c.date),
    counts,
  };
}
