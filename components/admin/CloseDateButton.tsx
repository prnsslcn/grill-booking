'use client';

import { useTransition } from 'react';

import { adminCloseOperatingDate } from '@/lib/admin/actions';

export function CloseDateButton({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (!confirm(`${date}을(를) 휴무 처리합니다. 고객 예약 달력에서도 닫힙니다(확정 예약은 유지).`)) return;
    startTransition(async () => adminCloseOperatingDate(date));
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-line-soft disabled:opacity-40"
    >
      {pending ? '처리 중…' : '이 날짜 휴무 처리'}
    </button>
  );
}
