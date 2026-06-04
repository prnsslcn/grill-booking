import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

/**
 * 토스 결제창(v2 payment) 호출. API 개별 연동 키(test_ck_)로 동작 — 결제위젯 키 불필요.
 * 성공 시 successUrl로 리다이렉트(paymentKey·orderId·amount) → 서버 confirm 재검증.
 */
export async function requestTossPayment(params: {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerMobilePhone?: string;
}): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 가 설정되지 않았습니다.');
  }
  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: `${window.location.origin}/booking/success`,
    failUrl: `${window.location.origin}/booking/fail`,
    customerName: params.customerName,
    ...(params.customerMobilePhone ? { customerMobilePhone: params.customerMobilePhone } : {}),
    card: {
      useEscrow: false,
      flowMode: 'DEFAULT',
      useCardPoint: false,
      useAppCardOnly: false,
    },
  });
}
