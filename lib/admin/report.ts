import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 월말보고용 데이터 — 이용일(slots.date) 기준, 확정 예약만.
 * 토스 온라인 결제(source='online')와 유선 예약 현금결제(source='offline')를 분리해 반환한다.
 * 무상(comp)·취소·환불·결제대기는 제외(실입금 기준).
 */

export interface ReportRow {
  date: string;
  part: number | null;
  facilityName: string;
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  composition: string; // 고기세트 + 추가메뉴 요약
  amount: number;
  paidAt: string | null; // 온라인 결제 승인 일시
  method: string | null; // 온라인 결제 수단
  note: string | null; // 유선 메모
}

export interface ReportData {
  from: string;
  to: string;
  online: ReportRow[];
  offline: ReportRow[];
  onlineTotal: number;
  offlineTotal: number;
}

const MEAT_LABEL: Record<string, string> = { pork: 'Pork', beef: 'Beef' };

interface SnapAddon {
  label: string;
  qty: number;
}
interface Snap {
  facility_name?: string;
  meat?: string;
  addons?: SnapAddon[];
  note?: string;
}

export async function getMonthReport(from: string, to: string): Promise<ReportData> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select(
      'booking_number, source, guest_name, guest_phone, guest_count, facility_snapshot, amount, slots!inner(date, part), payments(status, method, approved_at)',
    )
    .in('source', ['online', 'offline'])
    .eq('status', 'confirmed')
    .gte('slots.date', from)
    .lte('slots.date', to);

  const online: ReportRow[] = [];
  const offline: ReportRow[] = [];

  for (const r of data ?? []) {
    const snap = (r.facility_snapshot ?? {}) as Snap;
    const meat = snap.meat ? (MEAT_LABEL[snap.meat] ?? snap.meat) : '';
    const addons = (snap.addons ?? []).map((a) => `${a.label}×${a.qty}`).join(', ');
    const composition = [meat && `${meat} 세트`, addons].filter(Boolean).join(' · ');
    const paid = (r.payments ?? []).find((p) => p.status === 'paid') ?? null;

    const row: ReportRow = {
      date: r.slots?.date ?? '',
      part: (r.slots?.part as number) ?? null,
      facilityName: snap.facility_name ?? '',
      bookingNumber: r.booking_number,
      guestName: r.guest_name,
      guestPhone: r.guest_phone,
      guestCount: r.guest_count,
      composition,
      amount: r.amount,
      paidAt: paid?.approved_at ?? null,
      method: paid?.method ?? null,
      note: snap.note ?? null,
    };
    (r.source === 'online' ? online : offline).push(row);
  }

  const sortFn = (a: ReportRow, b: ReportRow) =>
    a.date.localeCompare(b.date) ||
    (a.part ?? 0) - (b.part ?? 0) ||
    a.facilityName.localeCompare(b.facilityName);
  online.sort(sortFn);
  offline.sort(sortFn);

  return {
    from,
    to,
    online,
    offline,
    onlineTotal: online.reduce((s, r) => s + r.amount, 0),
    offlineTotal: offline.reduce((s, r) => s + r.amount, 0),
  };
}
