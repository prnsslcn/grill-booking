/**
 * 운영일(금·토) 날짜 유틸. 클라이언트/서버 공용(브라우저 시간 기반 표시용).
 * 정합성 판단은 서버가 하므로, 여기서는 '다가오는 금·토' 후보만 만든다.
 */

export interface OperatingDate {
  iso: string; // YYYY-MM-DD
  weekday: '금' | '토';
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 오늘 이후(오늘 포함) 다가오는 금·토 날짜를 count개 반환. */
export function upcomingOperatingDates(count: number, from: Date = new Date()): OperatingDate[] {
  const result: OperatingDate[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (result.length < count) {
    const dow = cursor.getDay(); // 5=금, 6=토
    if (dow === 5 || dow === 6) {
      result.push({ iso: toIso(cursor), weekday: dow === 5 ? '금' : '토' });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
