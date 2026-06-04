'use client';

import { useTransition } from 'react';

import { adminSetSlotStatus } from '@/lib/admin/actions';

export function SlotToggle({
  slotId,
  status,
}: {
  slotId: string;
  status: 'open' | 'closed' | 'booked';
}) {
  const [pending, startTransition] = useTransition();

  if (status === 'booked') {
    return <span className="text-xs font-semibold text-accent">예약됨</span>;
  }

  const next = status === 'open' ? 'closed' : 'open';
  return (
    <button
      onClick={() => startTransition(async () => adminSetSlotStatus(slotId, next))}
      disabled={pending}
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${
        status === 'open'
          ? 'border-line text-muted hover:bg-line-soft'
          : 'border-accent/30 bg-accent-soft text-accent'
      }`}
    >
      {pending ? '…' : status === 'open' ? '열림 · 닫기' : '닫힘 · 열기'}
    </button>
  );
}
