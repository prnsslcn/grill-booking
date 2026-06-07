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
  capacity: number;
  pricePork: number;
  priceBeef: number;
  weatherDependent: boolean;
  parts: PartAvailability[];
}

export interface Addon {
  key: string;
  label: string;
  price: number;
}

export async function getAddons(): Promise<Addon[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('addons')
    .select('key, label, price')
    .eq('is_active', true)
    .order('sort', { ascending: true });
  return data ?? [];
}

export async function getAvailability(date: string): Promise<FacilityAvailability[]> {
  const supabase = createAdminClient();

  // 지연 생성: 운영일(금=5·토=6)이면 조회 시 항상 멱등 생성(중복은 건너뜀).
  // → 스케줄러 없이 채우고, 새로 추가된 시설(예: 야외 테이블)도 기존 날짜에 backfill 된다.
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (dow === 5 || dow === 6) {
    await supabase.rpc('generate_slots', { p_from: date, p_to: date });
  }

  const [{ data: facilities }, { data: slots }] = await Promise.all([
    supabase
      .from('facilities')
      .select('id, type, name, capacity, price_pork, price_beef, weather_dependent')
      .eq('is_active', true)
      .order('capacity', { ascending: true }),
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
      capacity: f.capacity,
      pricePork: f.price_pork,
      priceBeef: f.price_beef,
      weatherDependent: f.weather_dependent,
      parts: partAvail,
    };
  });
}
