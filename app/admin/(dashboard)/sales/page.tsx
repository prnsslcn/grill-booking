import { Card } from '@/components/ui/Card';
import { getSalesSummary } from '@/lib/admin/sales';
import { formatDateKorean, formatWon } from '@/lib/format';

export const dynamic = 'force-dynamic';

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function monthStart(): string {
  return `${kstToday().slice(0, 8)}01`;
}

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from = monthStart(), to = kstToday() } = await searchParams;
  const s = await getSalesSummary(from, to);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">매출 / 정산</h1>
      <p className="mt-1 text-sm text-muted">결제 승인일(KST) 기준. 순매출은 환불되지 않은 유효 결제 합계입니다.</p>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">시작일</span>
          <input type="date" name="from" defaultValue={from} className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">종료일</span>
          <input type="date" name="to" defaultValue={to} className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent" />
        </label>
        <button className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white">조회</button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">순매출 (유효 결제)</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{formatWon(s.paidAmount)}</p>
          <p className="mt-1 text-xs text-subtle">{s.paidCount}건</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">전액 환불</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{s.cancelledCount}건</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">부분 환불</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{s.partialCount}건</p>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-bold text-ink">결제수단별</h2>
      <Card className="mt-2 divide-y divide-line">
        {s.byMethod.length === 0 && <p className="p-5 text-sm text-subtle">데이터 없음</p>}
        {s.byMethod.map((m) => (
          <div key={m.method} className="flex items-center justify-between p-4">
            <span className="text-sm text-ink">{m.method}</span>
            <span className="text-sm text-muted">
              {m.count}건 · <span className="font-semibold text-ink">{formatWon(m.amount)}</span>
            </span>
          </div>
        ))}
      </Card>

      <h2 className="mt-8 text-lg font-bold text-ink">일별 매출</h2>
      <Card className="mt-2 divide-y divide-line">
        {s.byDate.length === 0 && <p className="p-5 text-sm text-subtle">데이터 없음</p>}
        {s.byDate.map((d) => (
          <div key={d.date} className="flex items-center justify-between p-4">
            <span className="text-sm text-ink">{formatDateKorean(d.date)}</span>
            <span className="text-sm text-muted">
              {d.count}건 · <span className="font-semibold text-ink">{formatWon(d.amount)}</span>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
