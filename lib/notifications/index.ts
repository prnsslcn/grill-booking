/**
 * 알림(문자) 추상화 레이어.
 *
 * 발송 대행 서비스(솔라피/NHN Cloud/알리고 등)는 미정 → 비즈니스 로직은 이 인터페이스에만
 * 의존하고, 추후 구현체만 교체한다. SDK를 비즈니스 로직에 직접 하드코딩하지 않는다.
 */

import { solapiSender } from '@/lib/notifications/providers/solapi';

export type NotificationType = 'confirm' | 'reminder' | 'cancel';
export type NotificationChannel = 'sms' | 'kakao_alimtalk';

export interface SendNotificationInput {
  bookingId: string;
  to: string;
  type: NotificationType;
  channel: NotificationChannel;
  /** 템플릿 변수 등 발송 페이로드 */
  payload: Record<string, unknown>;
}

export interface SendNotificationResult {
  status: 'sent' | 'failed';
  providerResponse?: unknown;
}

/** 발송 구현체가 따르는 계약. 구현체는 lib/notifications/providers/ 아래에 둔다(추후). */
export interface NotificationSender {
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}

/**
 * 기본 no-op 구현체. 발송 대행 서비스 선정 전까지 사용.
 * 실제로 보내지 않고 notifications 이력만 남기도록 호출 측에서 처리한다.
 */
export const noopSender: NotificationSender = {
  async send(input) {
    // 발송 대행 미설정 시 사용. 실제로 보내지 않고 호출 측이 이력만 남긴다.
    void input;
    return { status: 'sent', providerResponse: { noop: true } };
  },
};

/**
 * 실행 환경에 맞는 발송 구현체 반환(toss getTossClient와 동일한 env 게이트 패턴).
 *
 * SOLAPI_API_KEY/SECRET/SENDER가 모두 설정되면 실제 솔라피 발송, 아니면 noop.
 * → 키가 없는 개발/프리뷰에서는 자동으로 발송을 건너뛰고 이력만 기록한다.
 */
export function getNotificationSender(): NotificationSender {
  if (
    process.env.SOLAPI_API_KEY &&
    process.env.SOLAPI_API_SECRET &&
    process.env.SOLAPI_SENDER
  ) {
    return solapiSender;
  }
  return noopSender;
}
