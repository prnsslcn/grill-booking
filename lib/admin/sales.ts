import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 매출 집계 — 이용일(slots.date, KST) 기준. 확정 예약만.
 * 토스 온라인 결제(source='online')와 유선 현금(source='offline')을 함께 이용일별로 합산한다.
 * 무상(comp)·취소·환불(결제대기 포함)은 제외 — 실입금 기준. (월말보고와 동일 관점)
 */

export interface UsageSales {
  online: { count: number; amount: number };
  offline: { count: number; amount: number };
  total: { count: number; amount: number };
  byDate: {
    date: string;
    onlineCount: number;
    onlineAmount: number;
    offlineCount: number;
    offlineAmount: number;
    count: number;
    amount: number;
  }[];
}

export async function getUsageSales(from: string, to: string): Promise<UsageSales> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select('amount, source, slots!inner(date)')
    .in('source', ['online', 'offline'])
    .eq('status', 'confirmed')
    .gte('slots.date', from)
    .lte('slots.date', to);

  const online = { count: 0, amount: 0 };
  const offline = { count: 0, amount: 0 };
  const map = new Map<
    string,
    { date: string; onlineCount: number; onlineAmount: number; offlineCount: number; offlineAmount: number }
  >();

  for (const b of data ?? []) {
    const d = b.slots?.date ?? null;
    if (!d) continue;
    const isOnline = b.source === 'online';
    const bucket = isOnline ? online : offline;
    bucket.count += 1;
    bucket.amount += b.amount;

    const e =
      map.get(d) ?? { date: d, onlineCount: 0, onlineAmount: 0, offlineCount: 0, offlineAmount: 0 };
    if (isOnline) {
      e.onlineCount += 1;
      e.onlineAmount += b.amount;
    } else {
      e.offlineCount += 1;
      e.offlineAmount += b.amount;
    }
    map.set(d, e);
  }

  const byDate = [...map.values()]
    .map((e) => ({
      ...e,
      count: e.onlineCount + e.offlineCount,
      amount: e.onlineAmount + e.offlineAmount,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // 최신 이용일 먼저(내림차순)

  return {
    online,
    offline,
    total: { count: online.count + offline.count, amount: online.amount + offline.amount },
    byDate,
  };
}
