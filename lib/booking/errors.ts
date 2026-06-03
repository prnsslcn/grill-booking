/**
 * 예약 도메인 에러 — reserve_slot 등 DB 함수가 RAISE한 메시지를 타입화한다.
 */

export type ReservationErrorCode =
  | 'SLOT_NOT_FOUND' // 슬롯 없음
  | 'SLOT_CLOSED' // 관리자 마감
  | 'SLOT_TAKEN' // 이미 활성 예약 점유(동시성 충돌 포함)
  | 'PRICE_NOT_SET' // 시설 가격 미설정(판매 전)
  | 'UNKNOWN';

const KNOWN_CODES: ReservationErrorCode[] = [
  'SLOT_NOT_FOUND',
  'SLOT_CLOSED',
  'SLOT_TAKEN',
  'PRICE_NOT_SET',
];

export class ReservationError extends Error {
  readonly code: ReservationErrorCode;
  constructor(code: ReservationErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ReservationError';
    this.code = code;
  }
}

/** Supabase RPC 에러(또는 임의 에러)를 ReservationError로 매핑. */
export function toReservationError(error: unknown): ReservationError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const matched = KNOWN_CODES.find((code) => message.includes(code));
  return new ReservationError(matched ?? 'UNKNOWN', message);
}

/** 비즈니스 에러 코드 → HTTP 상태코드 매핑(API 라우트에서 사용). */
export function reservationHttpStatus(code: ReservationErrorCode): number {
  switch (code) {
    case 'SLOT_TAKEN':
      return 409; // 충돌
    case 'SLOT_CLOSED':
      return 409;
    case 'SLOT_NOT_FOUND':
      return 404;
    case 'PRICE_NOT_SET':
      return 422; // 처리 불가(판매 전)
    default:
      return 500;
  }
}
