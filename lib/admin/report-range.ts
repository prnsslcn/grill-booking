import { kstToday } from '@/lib/policy/booking-window';

/** 기본 보고 기간 = 이번 달 1일 ~ 말일 (KST 오늘 기준). */
export function defaultReportRange(now: Date = new Date()): { from: string; to: string } {
  const today = kstToday(now); // YYYY-MM-DD (KST)
  const [y, m] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}
