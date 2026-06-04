'use client';

import { useTransition } from 'react';

import { adminCloseDate } from '@/lib/admin/actions';

export function CloseDateButton({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (!confirm(`${date}의 열린 슬롯을 모두 닫습니다(휴무 처리).`)) return;
    startTransition(async () => adminCloseDate(date));
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
