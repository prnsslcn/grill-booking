'use client';

import { useState, useTransition } from 'react';

import {
  adminAddOpenDate,
  adminCloseOperatingDate,
  adminRemoveOpenDate,
  adminReopenOperatingDate,
} from '@/lib/admin/actions';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * 관리자 운영일 캘린더.
 * - 금·토: 기본 운영(연한 초록). 클릭하면 휴무(off), 다시 클릭하면 복구.
 * - 평일: 기본 미운영. 클릭하면 지정 오픈(on), 다시 클릭하면 해제.
 * 클릭은 낙관적으로 즉시 반영하고, 실패 시 되돌리며 안내한다. 과거 날짜는 비활성.
 */
export function OpenDatesCalendar({
  openDates,
  closedDates,
}: {
  openDates: string[];
  closedDates: string[];
}) {
  // 낙관적 로컬 상태 — 클릭 즉시 반영, 실패 시 되돌림. (초기값은 서버 prop으로 seed)
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(openDates));
  const [closedSet, setClosedSet] = useState<Set<string>>(() => new Set(closedDates));

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canPrev = view.y > today.getFullYear() || view.m > today.getMonth();
  function move(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  /** set 토글 헬퍼 — add=true면 추가, false면 제거한 새 Set 반환. */
  function withToggle(set: Set<string>, dstr: string, add: boolean): Set<string> {
    const n = new Set(set);
    if (add) n.add(dstr);
    else n.delete(dstr);
    return n;
  }

  function run(
    dstr: string,
    optimistic: () => void,
    revert: () => void,
    action: () => Promise<void>,
  ) {
    optimistic();
    setBusy(dstr);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        revert();
        alert(`처리에 실패했습니다: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
      } finally {
        setBusy(null);
      }
    });
  }

  function onCellClick(dstr: string, isWeekend: boolean) {
    if (isWeekend) {
      // 금·토: 휴무 ↔ 운영 토글
      if (closedSet.has(dstr)) {
        run(
          dstr,
          () => setClosedSet((s) => withToggle(s, dstr, false)),
          () => setClosedSet((s) => withToggle(s, dstr, true)),
          () => adminReopenOperatingDate(dstr),
        );
      } else {
        run(
          dstr,
          () => setClosedSet((s) => withToggle(s, dstr, true)),
          () => setClosedSet((s) => withToggle(s, dstr, false)),
          () => adminCloseOperatingDate(dstr),
        );
      }
    } else {
      // 평일: 지정 오픈 ↔ 해제 토글
      if (openSet.has(dstr)) {
        run(
          dstr,
          () => setOpenSet((s) => withToggle(s, dstr, false)),
          () => setOpenSet((s) => withToggle(s, dstr, true)),
          () => adminRemoveOpenDate(dstr),
        );
      } else {
        run(
          dstr,
          () => setOpenSet((s) => withToggle(s, dstr, true)),
          () => setOpenSet((s) => withToggle(s, dstr, false)),
          () => adminAddOpenDate(dstr),
        );
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand-soft" /> 금·토 기본 운영
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand" /> 지정 오픈
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-line-soft" /> 휴무
        </span>
        <span className="text-subtle">금·토 클릭 → 휴무 / 평일 클릭 → 오픈</span>
      </div>

      <div className="max-w-sm rounded-2xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={!canPrev}
            aria-label="이전 달"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line-soft disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-ink">
            {view.y}년 {view.m + 1}월
          </span>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="다음 달"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line-soft"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-1 text-xs font-medium ${
                i === 0 ? 'text-[#e5484d]/80' : i === 6 ? 'text-accent' : 'text-subtle'
              }`}
            >
              {w}
            </div>
          ))}

          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const date = new Date(view.y, view.m, d);
            const dow = date.getDay();
            const dstr = toIso(view.y, view.m, d);
            const isPast = date < today;
            const isWeekend = dow === 5 || dow === 6;
            const isOpen = openSet.has(dstr);
            const isClosed = closedSet.has(dstr);
            const isBusy = busy === dstr;
            const clickable = !isPast;

            let cls = 'text-subtle/40 cursor-default'; // past 기본
            let title = '';
            if (!isPast) {
              if (isWeekend && isClosed) {
                cls = 'bg-line-soft font-medium text-subtle line-through hover:bg-line';
                title = '휴무 — 클릭 시 운영 복구';
              } else if (isWeekend) {
                cls = 'bg-brand-soft font-medium text-brand-strong hover:bg-brand/20';
                title = '기본 운영일(금·토) — 클릭 시 휴무';
              } else if (isOpen) {
                cls = 'bg-brand font-bold text-white hover:bg-brand-strong';
                title = '지정 오픈됨 — 클릭 시 해제';
              } else {
                cls = 'font-medium text-ink hover:bg-brand-soft';
                title = '클릭 시 이 날짜 오픈';
              }
            }

            return (
              <button
                key={dstr}
                type="button"
                disabled={!clickable || isBusy}
                onClick={() => onCellClick(dstr, isWeekend)}
                title={title}
                className={`aspect-square rounded-lg text-sm transition-colors ${cls} ${
                  isBusy ? 'opacity-50' : ''
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
