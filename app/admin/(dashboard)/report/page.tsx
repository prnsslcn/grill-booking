import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { getMonthReport } from '@/lib/admin/report';
import { defaultReportRange } from '@/lib/admin/report-range';
import { formatWon } from '@/lib/format';

export const dynamic = 'force-dynamic';

const pad = (n: number) => String(n).padStart(2, '0');

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;

  // 기준: 이번 달(KST). month=YYYY-MM 로 선택한 달의 1일~말일을 from/to로 사용.
  const nowMonth = defaultReportRange().from.slice(0, 7); // YYYY-MM
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : nowMonth;
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = `${month}-${pad(new Date(y, m, 0).getDate())}`;

  // 최근 18개월 목록(현재 달 기준)
  const [cy, cm] = nowMonth.split('-').map(Number);
  const months = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(cy, cm - 1 - i, 1);
    const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return { value, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` };
  });
  const prevMonth = months[1]?.value ?? nowMonth;

  const data = await getMonthReport(from, to);
  const total = data.onlineTotal + data.offlineTotal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">월말보고</h1>
        <p className="mt-1 text-sm text-muted">
          이용일 기준 확정 예약을 토스 온라인 결제와 유선(현금) 결제로 나눠 엑셀로 내려받습니다.
          무상·취소·환불 예약은 제외됩니다.
        </p>
      </div>

      {/* 월 선택 */}
      <div className="flex flex-wrap items-end gap-3">
        <form action="/admin/report" method="get" className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">보고 월</span>
            <select
              name="month"
              defaultValue={month}
              className="h-10 rounded-lg border border-line bg-surface px-3 pr-8 text-sm outline-none focus:border-accent"
            >
              {months.map((mo) => (
                <option key={mo.value} value={mo.value}>
                  {mo.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-line-soft"
          >
            조회
          </button>
        </form>

        <div className="flex items-center gap-1.5">
          <Link
            href="/admin/report"
            className={`h-10 rounded-lg px-3 text-sm font-medium leading-10 transition-colors ${
              month === nowMonth ? 'bg-accent text-white' : 'border border-line text-muted hover:bg-line-soft'
            }`}
          >
            이번 달
          </Link>
          <Link
            href={`/admin/report?month=${prevMonth}`}
            className={`h-10 rounded-lg px-3 text-sm font-medium leading-10 transition-colors ${
              month === prevMonth ? 'bg-accent text-white' : 'border border-line text-muted hover:bg-line-soft'
            }`}
          >
            지난 달
          </Link>
        </div>
      </div>

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
