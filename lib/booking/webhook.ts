import 'server-only';

import { getTossClient, type TossClient } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

/**
 * 토스 웹훅(PAYMENT_STATUS_CHANGED) 안전망 처리.
 *
 * 일반 결제 웹훅은 서명 헤더가 없어 본문을 신뢰할 수 없다 → 웹훅은 트리거로만 쓰고,
 * paymentKey로 토스 결제조회 API를 재호출해 실제 상태를 확인한다(confirm과 동일한
 * 서버 재검증 철학). 위조 웹훅이 와도 토스 원천 조회에서 걸러진다.
 *
 * 외부 취소(토스 대시보드 직접취소·망취소 등)로 결제가 CANCELED/PARTIAL_CANCELED 되면
 * 우리 DB를 동기화한다. 정상 환불 경로(finalize_refund_tx)와 같은 함수를 재사용해
 * payments cancelled/partial · bookings refunded · slot open 으로 맞춘다(멱등).
 */
export async function syncPaymentFromWebhook(
  paymentKey: string,
  toss: TossClient = getTossClient(),
): Promise<void> {
  if (!paymentKey) return;

  // 신뢰 원천: 웹훅 본문이 아니라 토스 API로 실제 상태 재조회
  const result = await toss.get(paymentKey);
  if (result.status !== 'CANCELED' && result.status !== 'PARTIAL_CANCELED') {
    return; // 취소 외 상태변경은 동기화 대상 아님(승인은 confirm이 담당)
  }

  const supabase = createAdminClient();

  const { data: pay } = await supabase
    .from('payments')
    .select('booking_id, status')
    .eq('toss_payment_key', paymentKey)
    .maybeSingle();
  if (!pay) return; // 우리 결제가 아님

  // 멱등: 이미 취소가 반영된 결제(앱 경유 환불 포함)는 건너뜀
  if (pay.status === 'cancelled' || pay.status === 'partial_cancelled') return;

  const refunded = result.totalAmount - result.balanceAmount;
  const isPartial = result.status === 'PARTIAL_CANCELED';

  await supabase.rpc('finalize_refund_tx', {
    p_booking_id: pay.booking_id,
    p_refund_amount: refunded,
    p_is_partial: isPartial,
    p_did_toss_cancel: true, // 토스가 이미 취소함 — 추가 취소 호출 없이 DB만 정렬
    p_raw: result.raw as Json,
  });
}
