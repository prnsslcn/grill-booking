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
 * 월 단위 캘린더. 옵션으로 선택 가능 요일·과거 허용 여부를 제어.
 * - 고객 예약: allowedDows=[5,6](금·토), disablePast (지난 날짜·평일 비활성)
 * - 관리자 필터: 옵션 미지정 → 모든 요일·과거 포함 선택 가능
 */
export function Calendar({
  value,
  onSelect,
  allowedDows,
  allowedDates,
  closedDates,
  disablePast = false,
  maxDate,
  hint,
}: {
  value: string;
  onSelect: (iso: string) => void;
  allowedDows?: number[];
  /** allowedDows 외에 추가로 선택 가능한 특정 날짜(YYYY-MM-DD). 예: 관리자 지정 오픈일. */
  allowedDates?: string[];
  /** 운영일이라도 선택 불가 처리할 날짜(YYYY-MM-DD). 예: 관리자 휴무 처리일. */
  closedDates?: string[];
  disablePast?: boolean;
  /** 선택 가능한 마지막 날짜(YYYY-MM-DD). 이후 날짜·달 이동 비활성. */
  maxDate?: string;
  hint?: string;
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const init = value ? new Date(`${value}T00:00:00`) : now;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const maxD = maxDate ? new Date(`${maxDate}T00:00:00`) : null;

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // 과거 비활성일 때만 현재 달 이전으로 이동 제한
  const canPrev = !disablePast || view.y > today.getFullYear() || view.m > today.getMonth();
  // maxDate 설정 시 그 달 이후로는 다음 달 이동 제한
  const canNext =
    !maxD ||
    view.y < maxD.getFullYear() ||
    (view.y === maxD.getFullYear() && view.m < maxD.getMonth());
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
          disabled={!canNext}
          aria-label="다음 달"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line-soft disabled:opacity-30"
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
          // 운영 요일(allowedDows) 또는 지정 오픈일(allowedDates)이면 선택 가능
          const dayOk =
            (allowedDows ? allowedDows.includes(dow) : true) ||
            (allowedDates?.includes(dstr) ?? false);
          const isClosed = closedDates?.includes(dstr) ?? false;
          const isPast = date < today;
          const tooFar = maxDate ? dstr > maxDate : false;
          const disabled = !dayOk || isClosed || (disablePast && isPast) || tooFar;
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

      {hint && <p className="mt-3 text-center text-xs text-subtle">{hint}</p>}
    </div>
  );
}
