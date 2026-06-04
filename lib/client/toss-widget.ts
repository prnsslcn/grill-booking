import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

/**
 * 토스 결제위젯(v2) 초기화. 비회원이므로 customerKey는 ANONYMOUS.
 * 클라이언트 키는 NEXT_PUBLIC_(브라우저 노출 전제).
 */
export async function initTossWidgets(amount: number) {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 가 설정되지 않았습니다.');
  }
  const tossPayments = await loadTossPayments(clientKey);
  const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
  await widgets.setAmount({ currency: 'KRW', value: amount });
  return widgets;
}

export type TossWidgets = Awaited<ReturnType<typeof initTossWidgets>>;
