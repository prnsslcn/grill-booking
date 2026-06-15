'use client';

import { useState, useTransition } from 'react';

import { adminAddOpenDate, adminRemoveOpenDate } from '@/lib/admin/actions';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * 관리자 특정일 오픈 캘린더 — 평일을 클릭해 운영일로 열고/닫는다(open_dates 토글).
 * 금·토는 기본 운영일(색 구분, 토글 불가), 과거는 비활성.
 */
export function OpenDatesCalendar({ openDates }: { openDates: string[] }) {
  // 낙관적 로컬 상태 — 클릭 즉시 반영, 실패 시 되돌림. (초기값은 서버 prop으로 seed)
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(openDates));

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

  function toggle(dstr: string, isOpen: boolean) {
    // 낙관적 업데이트: 즉시 칠하기
    setOpenSet((prev) => {
      const n = new Set(prev);
      if (isOpen) n.delete(dstr);
      else n.add(dstr);
      return n;
    });
    setBusy(dstr);
    startTransition(async () => {
      try {
        if (isOpen) await adminRemoveOpenDate(dstr);
        else await adminAddOpenDate(dstr);
      } catch (e) {
        // 실패 시 되돌리고 안내
        setOpenSet((prev) => {
          const n = new Set(prev);
          if (isOpen) n.add(dstr);
          else n.delete(dstr);
          return n;
        });
        alert(`처리에 실패했습니다: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand-soft" /> 금·토 기본 운영
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand" /> 오픈함 (클릭 시 해제)
        </span>
        <span className="text-subtle">평일 클릭 → 오픈/해제</span>
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
            const isBusy = busy === dstr;
            const clickable = !isPast && !isWeekend;

            let cls = 'text-subtle/40 cursor-default'; // past 기본
            if (!isPast) {
              if (isWeekend) cls = 'bg-brand-soft font-medium text-brand-strong cursor-default';
              else if (isOpen) cls = 'bg-brand font-bold text-white hover:bg-brand-strong';
              else cls = 'font-medium text-ink hover:bg-brand-soft';
            }

            return (
              <button
                key={dstr}
                type="button"
                disabled={!clickable || isBusy}
                onClick={() => toggle(dstr, isOpen)}
                title={
                  isWeekend
                    ? '기본 운영일(금·토)'
                    : isOpen
                      ? '오픈됨 — 클릭 시 해제'
                      : '클릭 시 이 날짜 오픈'
                }
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
