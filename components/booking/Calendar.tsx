'use client';

import { useState } from 'react';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/**
 * 월 단위 캘린더. 운영일(금·토)만 선택 가능, 지난 날짜·평일은 비활성.
 * 월 이동(◀ ▶)으로 먼 미래(예: 8월)도 선택할 수 있다.
 */
export function Calendar({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (iso: string) => void;
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const init = value ? new Date(`${value}T00:00:00`) : now;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

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

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
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
              i === 5 || i === 6 ? 'text-accent' : 'text-subtle'
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const date = new Date(view.y, view.m, d);
          const dow = date.getDay();
          const isOperating = dow === 5 || dow === 6;
          const isPast = date < today;
          const disabled = !isOperating || isPast;
          const dstr = toIso(view.y, view.m, d);
          const selected = dstr === value;

          return (
            <button
              key={dstr}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dstr)}
              className={`aspect-square rounded-lg text-sm transition-colors ${
                selected
                  ? 'bg-accent font-bold text-white'
                  : disabled
                    ? 'cursor-default text-subtle/40'
                    : 'font-medium text-ink hover:bg-accent-soft'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-subtle">금·토만 예약 가능합니다.</p>
    </div>
  );
}
