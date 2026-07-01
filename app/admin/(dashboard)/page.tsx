import Link from 'next/link';

import { OfflineBookingForm } from '@/components/admin/OfflineBookingForm';
import { OfflineCancelButton } from '@/components/admin/OfflineCancelButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { listBookings } from '@/lib/admin/bookings';
import { getMonthBoard } from '@/lib/admin/calendar';
import { getAddons } from '@/lib/booking/availability';
import { formatDateKorean, formatWon } from '@/lib/format';
import { PARTS } from '@/types/domain';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SHORT: Record<string, string> = {
  tarp_tent: '타프',
  cabin: '카바나',
  outdoor_table: '야외',
};
const STATUS_META: Record<string, { tone: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  confirmed: { tone: 'success', label: '확정' },
  pending_payment: { tone: 'warning', label: '결제대기' },
  cancel_requested: { tone: 'warning', label: '취소요청' },
  refunded: { tone: 'neutral', label: '환불완료' },
  cancelled: { tone: 'neutral', label: '취소' },
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form method="get" action="/admin" className="flex gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="예약번호·이름·연락처"
        className="h-9 w-56 rounded-lg border border-line px-3 text-sm outline-none focus:border-accent"
      />
      <button className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-white">검색</button>
    </form>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; date?: string; dp?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  // 검색 모드 — 예약번호·이름·연락처 전역 검색(캘린더 대신 결과 리스트)
  if (q) {
    const results = await listBookings({ q });
    return (
      <div>
        <h1 className="text-xl font-bold text-ink">예약 검색</h1>
        <SearchForm defaultValue={q} />
        <p className="mt-4 text-sm text-muted">&quot;{q}&quot; · {results.length}건</p>
        <div className="mt-2 space-y-2">
          {results.map((b) => {
            const meta = STATUS_META[b.status] ?? { tone: 'neutral' as const, label: b.status };
            return (
              <Link key={b.bookingNumber} href={`/admin/bookings/${b.bookingNumber}`} className="block">
                <Card className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 hover:border-accent/40 hover:bg-line-soft/50">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {b.source === 'offline' && <Badge tone="neutral">유선</Badge>}
                  <span className="font-mono text-xs text-muted">{b.bookingNumber}</span>
                  <span className="font-medium text-ink">{b.facilityName}</span>
                  <span className="text-sm text-muted">
                    {b.date ? formatDateKorean(b.date) : '-'}
                    {b.part ? ` · ${PARTS[b.part].label}` : ''}
                  </span>
                  <span className="text-sm text-muted">
                    {b.guestName} · {b.guestPhone}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-ink">{formatWon(b.amount)}</span>
                </Card>
              </Link>
            );
          })}
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-subtle">결과가 없습니다.</p>
          )}
        </div>
        <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-accent-strong hover:underline">
          ← 캘린더로 돌아가기
        </Link>
      </div>
    );
  }

  const now = new Date();
  const y = Number(sp.y) || now.getFullYear();
  const m = Number(sp.m) || now.getMonth() + 1; // 1-based
  const date = sp.date ?? '';
  const dp = sp.dp === '1' || sp.dp === '2' ? sp.dp : ''; // 상세 예약목록 부 필터('' = 전체)

  const board = await getMonthBoard(y, m - 1);
  const dateBookings = date ? await listBookings({ date }) : [];
  const shownBookings = dp ? dateBookings.filter((b) => String(b.part) === dp) : dateBookings;
  const addons = date ? await getAddons() : [];

  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const openSet = new Set(board.openDates);
  const closedSet = new Set(board.closedDates);
  const iso = (d: number) => `${y}-${pad(m)}-${pad(d)}`;
  const isOperating = (d: number, dow: number) => {
    const ds = iso(d);
    if (closedSet.has(ds)) return false;
    return dow === 5 || dow === 6 || openSet.has(ds);
  };

  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const navHref = (yy: number, mm: number) => `/admin?y=${yy}&m=${mm}`;
  const cellHref = (d: number) => `/admin?y=${y}&m=${m}&date=${iso(d)}`;
  const dpHref = (v: string) => `/admin?y=${y}&m=${m}&date=${date}${v ? `&dp=${v}` : ''}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">예약 현황</h1>
          <p className="mt-1 text-sm text-muted">
            날짜별 시설 예약 현황(예약/총). 날짜를 클릭하면 유선 예약을 직접 추가할 수 있습니다.
          </p>
        </div>
        <SearchForm />
      </div>

      {/* 컨트롤: 월 이동 + 부 토글 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={navHref(prev.y, prev.m)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
            aria-label="이전 달"
          >
            ‹
          </Link>
          <span className="min-w-28 text-center text-base font-bold text-ink">
            {y}년 {m}월
          </span>
          <Link
            href={navHref(next.y, next.m)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
            aria-label="다음 달"
          >
            ›
          </Link>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-center text-xs font-semibold ${
              i === 0 ? 'text-danger/80' : i === 6 ? 'text-accent' : 'text-subtle'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const dow = new Date(y, m - 1, d).getDay();
          const ds = iso(d);
          const operating = isOperating(d, dow);
          const selected = ds === date;

          return (
            <Link
              key={ds}
              href={cellHref(d)}
              className={`flex min-h-[200px] flex-col rounded-xl border p-2.5 transition-colors ${
                selected
                  ? 'border-accent bg-accent-soft'
                  : operating
                    ? 'border-line bg-surface hover:border-accent/40 hover:bg-line-soft/50'
                    : 'border-transparent bg-line-soft/40'
              }`}
            >
              <span
                className={`text-base font-bold ${
                  operating ? 'text-ink' : 'text-subtle/50'
                }`}
              >
                {d}
              </span>
              {operating && (
                <div className="mt-1.5 space-y-1.5 text-xs leading-snug">
                  {([1, 2] as const).map((p, idx) => (
                    <div key={p} className={idx === 1 ? 'border-t border-line pt-1.5' : ''}>
                      <span className="mb-0.5 block font-semibold text-subtle">{p}부</span>
                      {board.facilities.map((f) => {
                        const booked = board.counts[ds]?.[p]?.[f.type] ?? 0;
                        const full = booked >= f.totalUnits;
                        return (
                          <div key={f.type} className="flex items-center justify-between">
                            <span className="text-subtle">{SHORT[f.type] ?? f.name}</span>
                            <span
                              className={
                                full
                                  ? 'font-bold text-danger'
                                  : booked > 0
                                    ? 'font-semibold text-accent-strong'
                                    : 'text-subtle/60'
                              }
                            >
                              {booked}/{f.totalUnits}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* 선택 날짜 상세 */}
      {date && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* 좌: 부별 현황 + 예약 목록 */}
          <div>
            <h2 className="text-lg font-bold text-ink">{formatDateKorean(date)}</h2>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                부별 현황 <span className="font-normal text-subtle">· 탭 클릭 시 해당 부만</span>
              </span>
              <Link
                href={dpHref('')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !dp ? 'bg-accent text-white' : 'border border-line text-muted hover:bg-line-soft'
                }`}
              >
                전체보기
              </Link>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {([1, 2] as const).map((p) => {
                const active = dp === String(p);
                return (
                  <Link
                    key={p}
                    href={dpHref(String(p))}
                    className={`rounded-2xl border p-4 transition-colors ${
                      active
                        ? 'border-accent bg-accent-soft ring-1 ring-accent'
                        : 'border-line bg-surface hover:border-accent/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">{PARTS[p].label}</p>
                    <div className="mt-2 space-y-1">
                      {board.facilities.map((f) => {
                        const booked = board.counts[date]?.[p]?.[f.type] ?? 0;
                        return (
                          <div key={f.type} className="flex justify-between text-sm">
                            <span className="text-muted">{f.name}</span>
                            <span className="font-medium text-ink">
                              {booked}/{f.totalUnits}
                              <span className="ml-1 text-xs text-subtle">
                                (잔여 {f.totalUnits - booked})
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                );
              })}
            </div>

            <h3 className="mt-6 text-sm font-bold text-ink">
              예약 목록{dp ? ` · ${PARTS[Number(dp) as 1 | 2].label}` : ' · 전체'} ({shownBookings.length})
            </h3>
            <div className="mt-2 space-y-2">
              {shownBookings.map((b) => {
                const meta = STATUS_META[b.status] ?? { tone: 'neutral' as const, label: b.status };
                const offline = b.source === 'offline';
                return (
                  <Card key={b.bookingNumber} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {offline && <Badge tone="neutral">유선</Badge>}
                    <span className="font-medium text-ink">{b.facilityName}</span>
                    <span className="text-sm text-muted">{b.part ? PARTS[b.part].label : '-'}</span>
                    <span className="text-sm text-muted">
                      {b.guestName} · {b.guestPhone} · {b.guestCount}명
                    </span>
                    <span className="ml-auto text-sm font-semibold text-ink">{formatWon(b.amount)}</span>
                    {offline && b.status === 'confirmed' ? (
                      <OfflineCancelButton bookingId={b.id} />
                    ) : (
                      <Link
                        href={`/admin/bookings/${b.bookingNumber}`}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-line-soft"
                      >
                        상세
                      </Link>
                    )}
                  </Card>
                );
              })}
              {shownBookings.length === 0 && (
                <p className="py-6 text-center text-sm text-subtle">
                  {dp ? '해당 부의 예약이 없습니다.' : '이 날짜의 예약이 없습니다.'}
                </p>
              )}
            </div>
          </div>

          {/* 우: 유선 예약 추가 */}
          <div>
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink">유선 예약 추가</h3>
              <p className="mt-1 text-xs text-muted">
                전화로 받은 예약을 등록하면 온라인 예약에서 자동으로 해당 동이 제외됩니다.
              </p>
              <div className="mt-4">
                <OfflineBookingForm
                  date={date}
                  defaultPart={1}
                  facilities={board.facilities.map((f) => ({
                    type: f.type,
                    name: f.name,
                    capacity: f.capacity,
                  }))}
                  addons={addons}
                />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
