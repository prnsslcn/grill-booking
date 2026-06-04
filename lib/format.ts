/** 원 단위 정수를 "50,000원" 형식으로. */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** YYYY-MM-DD → "6월 12일 (금)" */
export function formatDateKorean(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}
