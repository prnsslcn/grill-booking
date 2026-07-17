'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

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
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        `[전액 환불] ${bookingNumber}\n\n환불 규정(2일전 100%/1일전 50%/당일 0%)을 무시하고 결제액 전액 ${formatWon(amount)}을 환불합니다.\n자연재해 등 예외 상황에만 사용하세요.\n\n진행할까요?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await adminCancelFullRefund(bookingNumber);
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
      className="rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-[#fdecec] disabled:opacity-40"
    >
      {pending ? '처리 중…' : '전액 환불'}
    </button>
  );
}
