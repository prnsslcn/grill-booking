import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { getOfflineSummary, getSalesSummary } from '@/lib/admin/sales';
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
  const [s, off] = await Promise.all([getSalesSummary(from, to), getOfflineSummary(from, to)]);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">매출 / 정산</h1>
      <p className="mt-1 text-sm text-muted">결제 승인일(KST) 기준. 순매출은 환불되지 않은 유효 결제 합계입니다.</p>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">시작일</span>
          <DatePicker name="from" defaultValue={from} />
        </div>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">종료일</span>
          <DatePicker name="to" defaultValue={to} />
        </div>
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

      {/* 유선 예약 매출 — 토스 결제 미포함(현장·전화), 별도 합산 */}
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-dashed p-5">
        <div>
          <p className="text-sm font-semibold text-ink">유선 예약 매출</p>
          <p className="mt-0.5 text-xs text-subtle">현장·전화 등록분 · 토스 결제(위 매출) 미포함</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <div className="text-right">
            <p className="text-xs text-muted">기간({formatDateKorean(from)}~{formatDateKorean(to)}) · 이용일 기준</p>
            <p className="text-lg font-extrabold text-ink">
              {formatWon(off.periodAmount)} <span className="text-xs font-normal text-subtle">· {off.periodCount}건</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">누적 전체</p>
            <p className="text-lg font-extrabold text-ink">
              {formatWon(off.totalAmount)} <span className="text-xs font-normal text-subtle">· {off.totalCount}건</span>
            </p>
          </div>
        </div>
      </Card>

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
