import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isComingSoonType } from '@/lib/facilities';
import { isWithinBookingWindow } from '@/lib/policy/booking-window';
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

  // 예약 가능 기간(오늘~1개월, KST) 밖이면 슬롯을 생성하지 않고 전부 unavailable로 노출(슬롯 id 미노출).
  const inWindow = isWithinBookingWindow(date);

  // 지연 생성: 예약 가능 기간 내면 조회 시 멱등 생성. 운영일 판정(금·토 ∪ open_dates)은
  // generate_slots RPC가 수행하므로 운영일이 아니면 아무것도 생성되지 않는다(빈 INSERT).
  // → 스케줄러 없이 채우고, 관리자 지정 오픈일·새 시설도 backfill 된다.
  if (inWindow) {
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

  // 준비 중(comingSoon) 시설은 예약 목록에서 제외 — slotId 자체를 노출하지 않는다(선점 불가).
  const bookable = facilities.filter((f) => !isComingSoonType(f.type));

  // facility_id → { 1: slotId|null, 2: slotId|null }
  const openByFacility = new Map<string, Map<number, string>>();
  for (const slot of inWindow ? (slots ?? []) : []) {
    const facilityId = slot.facility_units?.facility_id;
    if (!facilityId) continue;
    if (!openByFacility.has(facilityId)) openByFacility.set(facilityId, new Map());
    const parts = openByFacility.get(facilityId)!;
    // 같은 (시설, 부)에 여러 동이 비어 있어도 첫 슬롯 하나만 선점 대상으로
    if (!parts.has(slot.part)) parts.set(slot.part, slot.id);
  }

  return bookable.map((f) => {
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
