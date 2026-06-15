'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { adminAddOpenDate, adminRemoveOpenDate } from '@/lib/admin/actions';
import { formatDateKorean } from '@/lib/format';

/**
 * 특정일 오픈 관리 — 금·토 외 날짜(성수기 등)를 운영일로 추가/해제.
 * 추가 시 해당 날짜 슬롯이 즉시 생성되어 고객이 예약 가능(예약 가능 기간 1개월 이내일 때).
 */
export function OpenDatesManager({ dates }: { dates: { date: string; note: string | null }[] }) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  function add() {
    if (!date) return;
    startTransition(async () => {
      await adminAddOpenDate(date, note);
      setDate('');
      setNote('');
    });
  }
  function remove(d: string) {
    if (!confirm(`${d} 오픈을 해제합니다.\n해당일의 미예약 슬롯이 닫힙니다(기존 예약은 유지).`)) return;
    startTransition(async () => adminRemoveOpenDate(d));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">오픈할 날짜</span>
          <DatePicker defaultValue={date} onChange={setDate} />
        </div>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">메모(선택)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 여름 성수기"
            className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-subtle"
          />
        </div>
        <Button onClick={add} disabled={pending || !date}>
          {pending ? '처리 중…' : '오픈 추가'}
        </Button>
      </div>

      {dates.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {dates.map((d) => (
            <li key={d.date} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-ink">
                {formatDateKorean(d.date)}
                {d.note && <span className="ml-2 text-subtle">· {d.note}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(d.date)}
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-line-soft disabled:opacity-40"
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-subtle">등록된 오픈일이 없습니다. (금·토는 기본 운영일)</p>
      )}
    </div>
  );
}
