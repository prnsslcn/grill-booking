import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Part } from '@/types/domain';

export interface AdminSlot {
  slotId: string;
  facilityName: string;
  unitLabel: string;
  part: Part;
  status: 'open' | 'closed' | 'booked';
}

export async function listSlotsByDate(date: string): Promise<AdminSlot[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('slots')
    .select('id, part, status, facility_units(unit_label, facilities(name))')
    .eq('date', date);

  const rows = (data ?? []).map((s) => ({
    slotId: s.id,
    facilityName: s.facility_units?.facilities?.name ?? '',
    unitLabel: s.facility_units?.unit_label ?? '',
    part: s.part as Part,
    status: s.status as AdminSlot['status'],
  }));

  rows.sort(
    (a, b) =>
      a.facilityName.localeCompare(b.facilityName) ||
      a.unitLabel.localeCompare(b.unitLabel, 'ko', { numeric: true }) ||
      a.part - b.part,
  );
  return rows;
}
