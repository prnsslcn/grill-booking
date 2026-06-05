/** 원 단위 정수를 "50,000원" 형식으로. */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 입력값을 휴대폰 형식(010-1234-5678)으로 자동 포맷. 숫자만 추출 후 하이픈 삽입. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** YYYY-MM-DD → "6월 12일 (금)" */
export function formatDateKorean(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}
