/**
 * 알림(문자) 추상화 레이어.
 *
 * 발송 대행 서비스(솔라피/NHN Cloud/알리고 등)는 미정 → 비즈니스 로직은 이 인터페이스에만
 * 의존하고, 추후 구현체만 교체한다. SDK를 비즈니스 로직에 직접 하드코딩하지 않는다.
 */

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
    // TODO: 서비스 선정 후 실제 구현체로 교체 (이 객체를 주입 지점에서만 바꾸면 됨).
    void input;
    return { status: 'sent', providerResponse: { noop: true } };
  },
};
