'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminCancelRefund } from '@/lib/admin/actions';
import { formatWon } from '@/lib/format';

/** 환불 규정(2일전 100%/1일전 50%/당일 0%)을 적용하는 일반 취소·환불. */
export function CancelButton({
  bookingNumber,
  refundAmount,
}: {
  bookingNumber: string;
  refundAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await adminCancelRefund(bookingNumber);
      if (!res.ok) {
        setOpen(false);
        alert(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:bg-[#fdecec]"
      >
        취소·환불
      </button>

      <ConfirmDialog
        open={open}
        tone="danger"
        title="예약을 취소·환불할까요?"
        confirmLabel="취소·환불"
        cancelLabel="닫기"
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
        description={
          <>
            <p>
              <span className="font-mono font-semibold text-ink">{bookingNumber}</span> 예약을
              취소합니다.
            </p>
            <p className="mt-2">
              환불 규정에 따라 <span className="font-semibold text-ink">{formatWon(refundAmount)}</span>
              이 환불됩니다.
            </p>
          </>
        }
      />
    </>
  );
}
