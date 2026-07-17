'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { adminCancelRefund } from '@/lib/admin/actions';
import { formatWon } from '@/lib/format';

export function CancelButton({
  bookingNumber,
  refundAmount,
}: {
  bookingNumber: string;
  refundAmount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`${bookingNumber} 예약을 취소·환불합니다.\n환불 예상: ${formatWon(refundAmount)}`)) {
      return;
    }
    startTransition(async () => {
      const res = await adminCancelRefund(bookingNumber);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-[#fdecec] disabled:opacity-40"
    >
      {pending ? '처리 중…' : '취소·환불'}
    </button>
  );
}
