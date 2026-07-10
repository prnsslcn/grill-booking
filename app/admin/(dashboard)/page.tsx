import Link from 'next/link';

import { OfflineBookingForm } from '@/components/admin/OfflineBookingForm';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { listBookings } from '@/lib/admin/bookings';
import { getMonthBoard } from '@/lib/admin/calendar';
import { getAddons } from '@/lib/booking/availability';
import { formatDateKorean, formatWon } from '@/lib/format';
import { kstToday } from '@/lib/policy/booking-window';
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
  searchParams: Promise<{
    y?: string;
    m?: string;
    date?: string;
    dp?: string;
    q?: string;
    sort?: string;
    range?: string;
    dir?: string;
    page?: string;
    past?: string;
    cx?: string;
    rf?: string;
  }>;
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
  // 기본 화면(날짜 미선택) 리스트: 정렬(필드+방향)·기간·페이지 옵션
  const sort = sp.sort === 'usage' ? 'usage' : 'confirmed'; // confirmed=예약순(created_at), usage=이용일순
  const range = sp.range === 'week' || sp.range === 'all' ? sp.range : 'month'; // 기본 이 달
  // 방향: 미지정 시 필드별 자연스러운 기본값(예약순=최근 먼저=desc, 이용일순=가까운 먼저=asc)
  const dir = sp.dir === 'asc' || sp.dir === 'desc' ? sp.dir : sort === 'usage' ? 'asc' : 'desc';
  const hidePast = sp.past === 'hide'; // 이용일이 오늘(KST) 이전인 예약 숨기기
  const showCancelled = sp.cx === '1'; // 취소 예약 표시(기본 숨김)
  const showRefunded = sp.rf === '1'; // 환불완료 예약 표시(기본 숨김)
  const listPage = Math.max(1, Number(sp.page) || 1);

  const board = await getMonthBoard(y, m - 1);
  const dateBookings = date ? await listBookings({ date }) : [];
  const shownBookings = dp ? dateBookings.filter((b) => String(b.part) === dp) : dateBookings;
  const addons = date ? await getAddons() : [];
  // 날짜 미선택 시에만 기본 리스트를 조회(넉넉히 가져와 기간·정렬은 서버에서 적용)
  const baseBookings = date ? [] : await listBookings({ limit: 1000 });

  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const openSet = new Set(board.openDates);
  const closedSet = new Set(board.closedDates);
  const iso = (d: number) => `${y}-${pad(m)}-${pad(d)}`;
  const isOperatingDate = (ds: string) => {
    if (closedSet.has(ds)) return false;
    const [yy, mm, dd] = ds.split('-').map(Number);
    const dow = new Date(yy, mm - 1, dd).getDay();
    return dow === 5 || dow === 6 || openSet.has(ds);
  };
  const isOperating = (d: number) => isOperatingDate(iso(d));
  // 선택 날짜가 운영일(금·토 ∪ 오픈일 − 휴무)인지 — 유선 예약은 운영일에만 가능
  const selectedOperating = date ? isOperatingDate(date) : false;

  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const cxrf = `&cx=${showCancelled ? '1' : '0'}&rf=${showRefunded ? '1' : '0'}`;
  const navHref = (yy: number, mm: number) =>
    `/admin?y=${yy}&m=${mm}&sort=${sort}&range=${range}&dir=${dir}&past=${hidePast ? 'hide' : 'show'}${cxrf}`;
  const cellHref = (d: number) => `/admin?y=${y}&m=${m}&date=${iso(d)}`;
  const dpHref = (v: string) => `/admin?y=${y}&m=${m}&date=${date}${v ? `&dp=${v}` : ''}`;
  // 기본 리스트 URL 빌더 — 지정 안 한 항목은 현재값 유지, 페이지는 명시(변경 시 1로 리셋)
  const listHref = (o: {
    sort?: string;
    range?: string;
    dir?: string;
    page?: number;
    past?: string;
    cx?: string;
    rf?: string;
  }) =>
    `/admin?y=${y}&m=${m}&sort=${o.sort ?? sort}&range=${o.range ?? range}&dir=${o.dir ?? dir}&past=${o.past ?? (hidePast ? 'hide' : 'show')}&cx=${o.cx ?? (showCancelled ? '1' : '0')}&rf=${o.rf ?? (showRefunded ? '1' : '0')}&page=${o.page ?? listPage}`;

  // 기본 리스트: 기간 필터 + 정렬(필드+방향). pending_payment(결제 미완, 임시)는 제외.
  const monthPrefix = `${y}-${pad(m)}`;
  const todayStr = kstToday();
  const t = new Date(`${todayStr}T00:00:00Z`);
  const monday = new Date(t);
  monday.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); // 이번 주 월요일(KST)
  const weekStart = monday.toISOString().slice(0, 10);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekEnd = sunday.toISOString().slice(0, 10);

  let listRows = baseBookings.filter((b) => b.status !== 'pending_payment');
  // 취소·환불완료는 토글로 표시 여부 제어(기본 숨김)
  if (!showCancelled) listRows = listRows.filter((b) => b.status !== 'cancelled');
  if (!showRefunded) listRows = listRows.filter((b) => b.status !== 'refunded');
  if (range === 'month') listRows = listRows.filter((b) => b.date?.startsWith(monthPrefix));
  else if (range === 'week')
    listRows = listRows.filter((b) => b.date && b.date >= weekStart && b.date <= weekEnd);
  // 이용일이 오늘(KST) 이전인 예약 숨기기(오늘 이용분은 유지)
  if (hidePast) listRows = listRows.filter((b) => b.date && b.date >= todayStr);
  // 오름차순 비교자(이용일순: 날짜→부 / 예약순: created_at) → 방향에 따라 뒤집기
  const cmpAsc = (a: (typeof listRows)[number], b: (typeof listRows)[number]) => {
    if (sort === 'usage') {
      const da = a.date ?? '9999-99-99';
      const db = b.date ?? '9999-99-99';
      return da !== db ? da.localeCompare(db) : (a.part ?? 9) - (b.part ?? 9);
    }
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  };
  listRows = [...listRows].sort((a, b) => (dir === 'asc' ? cmpAsc(a, b) : -cmpAsc(a, b)));

  // 페이지네이션(10개씩)
  const PER_PAGE = 10;
  const totalRows = listRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
  const curPage = Math.min(listPage, totalPages);
  const pageRows = listRows.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const rangeLabel = range === 'week' ? '이번 주' : range === 'all' ? '전체' : `${y}년 ${m}월`;
  const dirLabel = dir === 'asc' ? '오름차순' : '내림차순';

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
            scroll={false}
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
            scroll={false}
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
          const ds = iso(d);
          const operating = isOperating(d);
          const selected = ds === date;

          return (
            <Link
              key={ds}
              href={cellHref(d)}
              scroll={false}
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

      {/* 기본 리스트 (날짜 미선택 시) — 정렬·기간 옵션 */}
      {!date && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">예약 리스트</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-line p-0.5">
                {(
                  [
                    ['confirmed', '예약 확정순'],
                    ['usage', '이용일순'],
                  ] as const
                ).map(([v, label]) => (
                  <Link
                    key={v}
                    href={listHref({ sort: v, dir: v === 'usage' ? 'asc' : 'desc', page: 1 })}
                    scroll={false}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      sort === v ? 'bg-accent text-white' : 'text-muted hover:bg-line-soft'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <div className="flex rounded-lg border border-line p-0.5">
                {(
                  [
                    ['week', '이번 주'],
                    ['month', '이 달'],
                    ['all', '전체'],
                  ] as const
                ).map(([v, label]) => (
                  <Link
                    key={v}
                    href={listHref({ range: v, page: 1 })}
                    scroll={false}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      range === v ? 'bg-accent text-white' : 'text-muted hover:bg-line-soft'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              {/* 정렬 방향 토글 */}
              <Link
                href={listHref({ dir: dir === 'asc' ? 'desc' : 'asc', page: 1 })}
                scroll={false}
                className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-line-soft"
                title="정렬 방향 전환"
              >
                {dir === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
              </Link>
              {/* 지난 이용일 숨기기 토글 */}
              <Link
                href={listHref({ past: hidePast ? 'show' : 'hide', page: 1 })}
                scroll={false}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  hidePast
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:bg-line-soft'
                }`}
                title="이용일이 지난 예약 숨기기"
              >
                지난 예약 숨기기{hidePast ? ' ✓' : ''}
              </Link>
              {/* 취소 표시 토글 */}
              <Link
                href={listHref({ cx: showCancelled ? '0' : '1', page: 1 })}
                scroll={false}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  showCancelled
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:bg-line-soft'
                }`}
                title="취소 예약 표시"
              >
                취소{showCancelled ? ' ✓' : ''}
              </Link>
              {/* 환불완료 표시 토글 */}
              <Link
                href={listHref({ rf: showRefunded ? '0' : '1', page: 1 })}
                scroll={false}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  showRefunded
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:bg-line-soft'
                }`}
                title="환불완료 예약 표시"
              >
                환불완료{showRefunded ? ' ✓' : ''}
              </Link>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">
            {rangeLabel} · 총 {totalRows}건 · {sort === 'usage' ? '이용일순' : '예약순'} · {dirLabel}
            {hidePast ? ' · 지난 예약 제외' : ''}
            {!showCancelled || !showRefunded
              ? ` · ${[!showCancelled ? '취소' : '', !showRefunded ? '환불완료' : ''].filter(Boolean).join('·')} 숨김`
              : ''}
          </p>

          <div className="mt-3 space-y-2">
            {pageRows.map((b) => {
              const meta = STATUS_META[b.status] ?? { tone: 'neutral' as const, label: b.status };
              const offline = b.source === 'offline';
              return (
                <Link key={b.bookingNumber} href={`/admin/bookings/${b.bookingNumber}`} className="block">
                  <Card className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 hover:border-accent/40 hover:bg-line-soft/50">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {offline && <Badge tone="neutral">유선</Badge>}
                    <span className="text-sm font-medium text-muted">
                      {b.date ? formatDateKorean(b.date) : '-'}
                      {b.part ? ` · ${PARTS[b.part].label}` : ''}
                    </span>
                    <span className="font-medium text-ink">{b.facilityName}</span>
                    <span className="text-sm text-muted">
                      {b.guestName} · {b.guestPhone} · {b.guestCount}명
                    </span>
                    <span className="ml-auto text-sm font-semibold text-ink">{formatWon(b.amount)}</span>
                  </Card>
                </Link>
              );
            })}
            {totalRows === 0 && (
              <p className="py-10 text-center text-sm text-subtle">해당 조건의 예약이 없습니다.</p>
            )}
          </div>

          {/* 페이지네이션 (10개씩) */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {curPage > 1 ? (
                <Link
                  href={listHref({ page: curPage - 1 })}
                  scroll={false}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                  aria-label="이전 페이지"
                >
                  ‹
                </Link>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-subtle/40">
                  ‹
                </span>
              )}
              <span className="min-w-16 text-center text-sm font-medium text-ink">
                {curPage} / {totalPages}
              </span>
              {curPage < totalPages ? (
                <Link
                  href={listHref({ page: curPage + 1 })}
                  scroll={false}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                  aria-label="다음 페이지"
                >
                  ›
                </Link>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-subtle/40">
                  ›
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
                scroll={false}
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
                    scroll={false}
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
                  <Link key={b.bookingNumber} href={`/admin/bookings/${b.bookingNumber}`} className="block">
                    <Card className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 hover:border-accent/40 hover:bg-line-soft/50">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {offline && <Badge tone="neutral">유선</Badge>}
                      <span className="font-medium text-ink">{b.facilityName}</span>
                      <span className="text-sm text-muted">{b.part ? PARTS[b.part].label : '-'}</span>
                      <span className="text-sm text-muted">
                        {b.guestName} · {b.guestPhone} · {b.guestCount}명
                      </span>
                      <span className="ml-auto text-sm font-semibold text-ink">{formatWon(b.amount)}</span>
                    </Card>
                  </Link>
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
              {selectedOperating ? (
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
              ) : (
                <div className="mt-4 rounded-xl border border-line bg-line-soft/60 p-4">
                  <p className="text-sm font-semibold text-ink">이 날짜는 운영일이 아닙니다.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    유선 예약은 운영일(금·토 또는 오픈한 날)에만 등록할 수 있습니다. 성수기 등으로 이
                    날짜에 예약을 받으려면 먼저 슬롯 관리에서 날짜를 오픈하세요.
                  </p>
                  <Link
                    href="/admin/slots"
                    className="mt-3 inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong"
                  >
                    슬롯 관리로 이동 →
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
