import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 매출/정산 집계. 결제 승인일(approved_at, KST) 기준.
 * 순매출 ≈ 유효 결제(paid) 합계. 환불(전액/부분)은 건수로 별도 표기.
 */

export interface SalesSummary {
  paidCount: number;
  paidAmount: number;
  cancelledCount: number;
  partialCount: number;
  byMethod: { method: string; count: number; amount: number }[];
  byDate: { date: string; count: number; amount: number }[];
}

/**
 * 유선(오프라인) 예약 매출 집계. 토스 결제가 없어 매출/정산(getSalesSummary)에 안 잡히므로 별도 합산.
 * 대상: source='offline' && status='confirmed'(취소된 유선은 제외). amount는 등록 시 확정 금액.
 *   - total*: 누적(전체 기간)
 *   - period*: 이용일(slot.date) 기준 [from, to] 구간
 */
export interface OfflineSummary {
  totalAmount: number;
  totalCount: number;
  periodAmount: number;
  periodCount: number;
}

export async function getOfflineSummary(from: string, to: string): Promise<OfflineSummary> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select('amount, slots(date)')
    .eq('source', 'offline')
    .eq('status', 'confirmed');

  let totalAmount = 0;
  let totalCount = 0;
  let periodAmount = 0;
  let periodCount = 0;
  for (const b of data ?? []) {
    totalAmount += b.amount;
    totalCount += 1;
    const d = b.slots?.date ?? null;
    if (d && d >= from && d <= to) {
      periodAmount += b.amount;
      periodCount += 1;
    }
  }
  return { totalAmount, totalCount, periodAmount, periodCount };
}

function kstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function getSalesSummary(from: string, to: string): Promise<SalesSummary> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('payments')
    .select('status, method, amount, approved_at')
    .not('approved_at', 'is', null)
    .gte('approved_at', `${from}T00:00:00+09:00`)
    .lte('approved_at', `${to}T23:59:59+09:00`);

  let paidCount = 0;
  let paidAmount = 0;
  let cancelledCount = 0;
  let partialCount = 0;
  const methodMap = new Map<string, { count: number; amount: number }>();
  const dateMap = new Map<string, { count: number; amount: number }>();

  for (const p of data ?? []) {
    if (p.status === 'paid') {
      paidCount += 1;
      paidAmount += p.amount;
      const m = p.method ?? '기타';
      const mm = methodMap.get(m) ?? { count: 0, amount: 0 };
      methodMap.set(m, { count: mm.count + 1, amount: mm.amount + p.amount });
      const dk = p.approved_at ? kstDate(p.approved_at) : '-';
      const dd = dateMap.get(dk) ?? { count: 0, amount: 0 };
      dateMap.set(dk, { count: dd.count + 1, amount: dd.amount + p.amount });
    } else if (p.status === 'cancelled') {
      cancelledCount += 1;
    } else if (p.status === 'partial_cancelled') {
      partialCount += 1;
    }
  }

  return {
    paidCount,
    paidAmount,
    cancelledCount,
    partialCount,
    byMethod: [...methodMap.entries()]
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount),
    byDate: [...dateMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
