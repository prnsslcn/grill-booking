/**
 * 예약 가능 기간(서비스 이용 기간) — 단일 출처.
 *
 * 토스페이먼츠 리스크팀 요구: 예약 가능한 최대 날짜를 정하고 사이트에 명시.
 * 정책: 오늘(KST)부터 1개월 이내 날짜까지 예약 가능.
 *   예) 6/15 예약 시 7/14까지 가능(= 오늘 + 1개월 − 1일).
 *
 * 시간은 서버에서 KST로 계산한다(클라이언트 시간 불신). 클라이언트 달력은 UX 보조,
 * 실제 차단은 서버(getAvailability·reserveSlot)에서 수행.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 예약 가능 기간(개월). 정책 변경 시 이 값만 수정. */
export const BOOKING_WINDOW_MONTHS = 1;

/** 당일 예약 마감 시각(KST, 시). 이 시각 이후엔 당일(1·2부 모두) 예약 불가. 정책 변경 시 이 값만 수정. */
export const SAME_DAY_CUTOFF_HOUR = 13;

function toKst(now: Date): Date {
  return new Date(now.getTime() + KST_OFFSET_MS);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** KST 기준 오늘 날짜(YYYY-MM-DD). */
export function kstToday(now: Date = new Date()): string {
  return iso(toKst(now));
}

/** 예약 가능한 마지막 날짜(YYYY-MM-DD) = 오늘(KST) + N개월 − 1일. */
export function bookingMaxDate(now: Date = new Date()): string {
  const d = toKst(now);
  d.setUTCMonth(d.getUTCMonth() + BOOKING_WINDOW_MONTHS);
  d.setUTCDate(d.getUTCDate() - 1);
  return iso(d);
}

/** 당일 예약 마감 시각(SAME_DAY_CUTOFF_HOUR, KST) 지났는지. */
export function isSameDayCutoffPassed(now: Date = new Date()): boolean {
  return toKst(now).getUTCHours() >= SAME_DAY_CUTOFF_HOUR;
}

/**
 * date(YYYY-MM-DD)가 예약 가능한지: 오늘 ≤ date ≤ 최대일.
 * 단, 당일(date == 오늘)은 KST 마감 시각(SAME_DAY_CUTOFF_HOUR) 이전까지만 가능(1·2부 공통).
 */
export function isWithinBookingWindow(date: string, now: Date = new Date()): boolean {
  const today = kstToday(now);
  if (date < today || date > bookingMaxDate(now)) return false;
  if (date === today && isSameDayCutoffPassed(now)) return false; // 당일 마감 시각 이후
  return true;
}

/** 캘린더에서 선택 가능한 가장 이른 날짜(YYYY-MM-DD). 당일 마감이면 내일. */
export function firstBookableDate(now: Date = new Date()): string {
  const d = toKst(now);
  if (isSameDayCutoffPassed(now)) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}
