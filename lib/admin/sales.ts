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
