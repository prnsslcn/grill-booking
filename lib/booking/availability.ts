import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType, Part } from '@/types/domain';

/**
 * 특정 날짜의 예약 가능 현황. 시설 종류 × 부(1·2)별로 open 슬롯 1개의 id를 노출.
 * 고객은 동(unit) 번호를 고르지 않으므로 (종류, 부)당 비어있는 슬롯 하나를 선점 대상으로 준다.
 */

export interface PartAvailability {
  part: Part;
  available: boolean;
  slotId: string | null;
}

export interface FacilityAvailability {
  type: FacilityType;
  name: string;
  price: number;
  parts: PartAvailability[];
}

export async function getAvailability(date: string): Promise<FacilityAvailability[]> {
  const supabase = createAdminClient();

  // 지연 생성: 운영일(금=5·토=6)인데 해당 날짜 슬롯이 아직 없으면 즉석 생성(idempotent).
  // → 슬롯을 미리 만들어두는 스케줄러 없이, 고객이 조회하는 순간 채운다.
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (dow === 5 || dow === 6) {
    const { count } = await supabase
      .from('slots')
      .select('*', { count: 'exact', head: true })
      .eq('date', date);
    if ((count ?? 0) === 0) {
      await supabase.rpc('generate_slots', { p_from: date, p_to: date });
    }
  }

  const [{ data: facilities }, { data: slots }] = await Promise.all([
    supabase
      .from('facilities')
      .select('id, type, name, price')
      .eq('is_active', true)
      .order('price', { ascending: true }),
    supabase
      .from('slots')
      .select('id, part, facility_units(facility_id)')
      .eq('date', date)
      .eq('status', 'open'),
  ]);

  if (!facilities) return [];

  // facility_id → { 1: slotId|null, 2: slotId|null }
  const openByFacility = new Map<string, Map<number, string>>();
  for (const slot of slots ?? []) {
    const facilityId = slot.facility_units?.facility_id;
    if (!facilityId) continue;
    if (!openByFacility.has(facilityId)) openByFacility.set(facilityId, new Map());
    const parts = openByFacility.get(facilityId)!;
    // 같은 (시설, 부)에 여러 동이 비어 있어도 첫 슬롯 하나만 선점 대상으로
    if (!parts.has(slot.part)) parts.set(slot.part, slot.id);
  }

  return facilities.map((f) => {
    const parts = openByFacility.get(f.id);
    const partAvail = ([1, 2] as Part[]).map((p) => {
      const slotId = parts?.get(p) ?? null;
      return { part: p, available: slotId !== null, slotId };
    });
    return {
      type: f.type as FacilityType,
      name: f.name,
      price: f.price,
      parts: partAvail,
    };
  });
}
