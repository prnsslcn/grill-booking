import { Card } from '@/components/ui/Card';
import { getMonthReport } from '@/lib/admin/report';
import { defaultReportRange } from '@/lib/admin/report-range';
import { formatWon } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const def = defaultReportRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;

  const data = await getMonthReport(from, to);
  const total = data.onlineTotal + data.offlineTotal;

  const inputCls =
    'h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-accent';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">월말보고</h1>
        <p className="mt-1 text-sm text-muted">
          이용일 기준 확정 예약을 토스 온라인 결제와 유선(현금) 결제로 나눠 엑셀로 내려받습니다.
          무상·취소·환불 예약은 제외됩니다.
        </p>
      </div>

      {/* 기간 설정 */}
      <form action="/admin/report" method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">시작(이용일)</span>
          <input type="date" name="from" defaultValue={from} className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">종료(이용일)</span>
          <input type="date" name="to" defaultValue={to} className={inputCls} />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-line-soft"
        >
          조회
        </button>
      </form>

      {/* 요약 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted">토스 온라인 결제</p>
          <p className="mt-1 text-lg font-bold text-ink">{formatWon(data.onlineTotal)}</p>
          <p className="text-xs text-subtle">{data.online.length}건</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">유선 예약 (현금)</p>
          <p className="mt-1 text-lg font-bold text-ink">{formatWon(data.offlineTotal)}</p>
          <p className="text-xs text-subtle">{data.offline.length}건</p>
        </Card>
        <Card className="border-accent/30 bg-accent-soft/40 p-4">
          <p className="text-sm text-muted">합계</p>
          <p className="mt-1 text-lg font-bold text-ink">{formatWon(total)}</p>
          <p className="text-xs text-subtle">{data.online.length + data.offline.length}건</p>
        </Card>
      </div>

      {/* 다운로드 */}
      <a
        href={`/api/admin/report?from=${from}&to=${to}`}
        className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        엑셀(.xlsx) 다운로드
      </a>
      <p className="text-xs text-subtle">
        기간: {from} ~ {to} · 시트 2개(토스 온라인 / 유선 현금)로 저장됩니다.
      </p>
    </div>
  );
}
