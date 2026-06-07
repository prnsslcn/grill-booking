/**
 * 시나리오별 문자 문구 생성. 발송 채널·구현체와 분리(순수 함수)하여 테스트·교체가 쉽도록.
 *
 * 알림톡 템플릿 승인 전까지는 일반 SMS 본문으로 사용한다. 추후 알림톡 도입 시
 * 템플릿 변수 매핑만 이 모듈을 참고해 작성하면 된다.
 */

import { formatDateKorean, formatWon } from '@/lib/format';
import { PARTS, type Part } from '@/types/domain';

const BRAND = '알펜시아 BBQ';
/** 고객 문자 말미 안내. 매장 공식 문의처(SiteFooter와 동일). */
const CONTACT = '문의 033-339-0616 (11:00~19:00)';

export interface BookingInfo {
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  amount: number;
  facilityName: string;
  unitLabel: string;
  dateIso: string;
  part: Part;
}

export interface MessageExtra {
  /** 취소 시 실제 환불 금액(원). 0이면 규정상 환불 없음. */
  refundedAmount?: number;
}

export interface RenderedMessages {
  customer: string;
  admin: string;
}

/** "6월 12일 (금) · 1부 17:00~19:00" */
function whenLine(info: BookingInfo): string {
  const p = PARTS[info.part];
  return `${formatDateKorean(info.dateIso)} · ${p.label} ${p.start}~${p.end}`;
}

/** "타프 텐트 1호" — unit_label이 이미 시설명을 포함하면 중복 제거. */
function placeLine(info: BookingInfo): string {
  const { facilityName, unitLabel } = info;
  if (!unitLabel) return facilityName;
  if (!facilityName) return unitLabel;
  return unitLabel.startsWith(facilityName) ? unitLabel : `${facilityName} ${unitLabel}`;
}

export function buildMessages(
  type: 'confirm' | 'cancel',
  info: BookingInfo,
  extra: MessageExtra = {},
): RenderedMessages {
  return type === 'confirm' ? confirmMessages(info) : cancelMessages(info, extra);
}

function confirmMessages(info: BookingInfo): RenderedMessages {
  const customer = [
    `[${BRAND}] 예약이 확정되었습니다.`,
    '',
    `${info.guestName}님, 결제가 완료되어 예약이 확정되었습니다.`,
    `· 예약번호 ${info.bookingNumber}`,
    `· 일시 ${whenLine(info)}`,
    `· 장소 ${placeLine(info)}`,
    `· 인원 ${info.guestCount}명`,
    `· 결제금액 ${formatWon(info.amount)}`,
    '',
    '예약 시간에 맞춰 방문해 주세요. 변경·취소는 예약조회에서 가능합니다.',
    CONTACT,
  ].join('\n');

  const admin = [
    `[${BRAND}/관리자] 신규 예약 확정`,
    `${whenLine(info)} / ${placeLine(info)}`,
    `${info.guestName}(${info.guestPhone}) ${info.guestCount}명 / ${formatWon(info.amount)}`,
    `예약번호 ${info.bookingNumber}`,
  ].join('\n');

  return { customer, admin };
}

function cancelMessages(info: BookingInfo, extra: MessageExtra): RenderedMessages {
  const refunded = extra.refundedAmount ?? 0;
  const refundLine =
    refunded > 0
      ? `· 환불금액 ${formatWon(refunded)} (결제수단에 따라 수일 소요)`
      : '· 환불금액 없음 (취소 규정 적용)';

  const customer = [
    `[${BRAND}] 예약이 취소되었습니다.`,
    '',
    `${info.guestName}님, 아래 예약이 취소 처리되었습니다.`,
    `· 예약번호 ${info.bookingNumber}`,
    `· 일시 ${whenLine(info)}`,
    `· 장소 ${placeLine(info)}`,
    refundLine,
    CONTACT,
  ].join('\n');

  const admin = [
    `[${BRAND}/관리자] 예약 취소`,
    `${whenLine(info)} / ${placeLine(info)}`,
    `${info.guestName}(${info.guestPhone}) / 환불 ${refunded > 0 ? formatWon(refunded) : '없음'}`,
    `예약번호 ${info.bookingNumber}`,
  ].join('\n');

  return { customer, admin };
}
