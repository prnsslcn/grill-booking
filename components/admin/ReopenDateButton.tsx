'use client';

import { useTransition } from 'react';

import { adminReopenOperatingDate } from '@/lib/admin/actions';

/**
 * 이 날짜의 닫힌 슬롯을 다시 연다(휴무 해제 + closed→open 복구).
 * 오픈일인데 슬롯이 닫혀 "고객 달력엔 보이나 전부 마감"인 상태를 원클릭으로 복구한다.
 * 예약된(booked) 슬롯은 그대로 유지.
 */
export function ReopenDateButton({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (!confirm(`${date}의 닫힌 슬롯을 다시 엽니다(고객 예약 재개).`)) return;
    startTransition(async () => adminReopenOperatingDate(date));
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-accent px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent-soft disabled:opacity-40"
    >
      {pending ? '처리 중…' : '이 날짜 슬롯 다시 열기'}
    </button>
  );
}
