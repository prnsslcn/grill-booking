import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { getUsageSales } from '@/lib/admin/sales';
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
  const s = await getUsageSales(from, to);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">매출 / 정산</h1>
      <p className="mt-1 text-sm text-muted">
        이용일(KST) 기준. 확정 예약 매출을 토스 온라인 결제와 유선(현금)으로 나눠 합산합니다. 무상·취소·환불은
        제외됩니다.
      </p>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">시작일(이용일)</span>
          <DatePicker name="from" defaultValue={from} />
        </div>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">종료일(이용일)</span>
          <DatePicker name="to" defaultValue={to} />
        </div>
        <button className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white">조회</button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">토스 온라인 결제</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{formatWon(s.online.amount)}</p>
          <p className="mt-1 text-xs text-subtle">{s.online.count}건</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">유선 예약 (현금)</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{formatWon(s.offline.amount)}</p>
          <p className="mt-1 text-xs text-subtle">{s.offline.count}건</p>
        </Card>
        <Card className="border-accent/30 bg-accent-soft/40 p-5">
          <p className="text-sm text-muted">합계</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{formatWon(s.total.amount)}</p>
          <p className="mt-1 text-xs text-subtle">{s.total.count}건</p>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-bold text-ink">일별 매출 (이용일 기준)</h2>
      <Card className="mt-2 divide-y divide-line">
        {s.byDate.length === 0 && <p className="p-5 text-sm text-subtle">데이터 없음</p>}
        {s.byDate.map((d) => (
          <div key={d.date} className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm font-medium text-ink">{formatDateKorean(d.date)}</span>
            <div className="text-right">
              <span className="text-sm text-muted">
                {d.count}건 · <span className="font-semibold text-ink">{formatWon(d.amount)}</span>
              </span>
              <p className="mt-0.5 text-xs text-subtle">
                온라인 {d.onlineCount}건 {formatWon(d.onlineAmount)} · 유선 {d.offlineCount}건{' '}
                {formatWon(d.offlineAmount)}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
