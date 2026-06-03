/**
 * 환불 정책 — 단일 출처(booking-flow.md §환불 규정).
 *
 * 기준: 이용일 자정(00:00, KST). 결제 금액(bookings.amount) 기준.
 *   - 이용 2일 전까지: 100% 환불 (차감 0%)
 *   - 이용 1일 전:     50% 환불
 *   - 이용 당일/노쇼:  환불 없음
 *
 * 시간은 반드시 서버에서 KST로 계산한다(클라이언트 시간 불신).
 * 환불율을 바꿔야 하면 이 표 한 곳만 수정한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 환불율 표: 이용일까지 남은 '일수' → 환불 비율(0~1). */
export const REFUND_RATES = {
  /** 2일 이상 남음 */
  full: 1,
  /** 1일 남음 */
  half: 0.5,
  /** 당일(0일) 또는 노쇼 */
  none: 0,
} as const;

/**
 * KST 기준, 두 시각의 '자정 날짜' 차이(일수)를 구한다.
 * @param usageDate 이용일 (YYYY-MM-DD 또는 Date)
 * @param now 취소 요청 시각 (기본: 현재)
 */
export function daysUntilUsage(usageDate: string | Date, now: Date): number {
  const usage = typeof usageDate === 'string' ? new Date(`${usageDate}T00:00:00+09:00`) : usageDate;
  // 각 시각을 KST 자정으로 내림한 뒤 일수 차이 계산
  const toKstMidnight = (d: Date) => {
    const kst = new Date(d.getTime() + KST_OFFSET_MS);
    kst.setUTCHours(0, 0, 0, 0);
    return kst.getTime() - KST_OFFSET_MS;
  };
  const diffMs = toKstMidnight(usage) - toKstMidnight(now);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/** 환불율(0~1)을 반환. */
export function refundRate(usageDate: string | Date, now: Date): number {
  const days = daysUntilUsage(usageDate, now);
  if (days >= 2) return REFUND_RATES.full;
  if (days === 1) return REFUND_RATES.half;
  return REFUND_RATES.none;
}

/** 환불 금액(원, 정수)을 반환. amount는 결제 금액(정수). */
export function refundAmount(amount: number, usageDate: string | Date, now: Date): number {
  return Math.floor(amount * refundRate(usageDate, now));
}
