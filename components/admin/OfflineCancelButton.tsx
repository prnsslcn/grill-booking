'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { adminCancelOfflineBooking } from '@/lib/admin/actions';

/** 오프라인(유선) 예약 취소 — 슬롯 복구. 오등록 정정용. */
export function OfflineCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('이 유선 예약을 취소하고 슬롯을 복구할까요?')) return;
        start(async () => {
          try {
            const res = await adminCancelOfflineBooking(bookingId);
            if (!res.ok) {
              alert(res.error);
              return;
            }
            router.refresh();
          } catch (e) {
            alert(e instanceof Error ? e.message : '취소 실패');
          }
        });
      }}
      className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-line-soft disabled:opacity-40"
    >
      {pending ? '취소 중…' : '취소'}
    </button>
  );
}
