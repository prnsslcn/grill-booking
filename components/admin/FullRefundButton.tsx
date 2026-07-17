'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminCancelFullRefund } from '@/lib/admin/actions';
import { formatWon } from '@/lib/format';

/**
 * 규정 무시 전액 환불(관리자 예외 처리).
 * 자연재해·매장 사유 등으로 당일이라도 100% 돌려줘야 할 때만 사용한다.
 * 일반 취소는 CancelButton(환불 규정 적용)을 쓴다.
 */
export function FullRefundButton({
  bookingNumber,
  amount,
}: {
  bookingNumber: string;
  amount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await adminCancelFullRefund(bookingNumber);
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
        className="rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-[#fdecec]"
      >
        전액 환불
      </button>

      <ConfirmDialog
        open={open}
        tone="danger"
        title="전액 환불할까요?"
        confirmLabel="전액 환불"
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
        description={
          <>
            <p>
              <span className="font-mono font-semibold text-ink">{bookingNumber}</span> 예약을 취소하고
              결제액 <span className="font-semibold text-ink">{formatWon(amount)}</span> 전액을 환불합니다.
            </p>
            <p className="mt-2 rounded-xl bg-[#fdecec] px-3 py-2 text-danger">
              환불 규정(2일 전 100% / 1일 전 50% / 당일 0%)을 <b>무시</b>합니다. 자연재해 등 예외
              상황에만 사용하세요.
            </p>
          </>
        }
      />
    </>
  );
}
