import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { serverEnv } from '@/lib/env';
import type { NotificationSender } from '@/lib/notifications';

/**
 * 솔라피(Solapi) 문자 발송 어댑터. NotificationSender 계약 구현체.
 *
 * 교체 가능한 seam(toss와 동일 패턴): SOLAPI_* env가 모두 있으면 이 구현체,
 * 없으면 noopSender를 사용한다(lib/notifications/index.ts의 getNotificationSender).
 *
 * 인증: HMAC-SHA256. signature = HMAC(date + salt, apiSecret) hex.
 * 알림톡은 템플릿 승인이 필요하므로 우선 일반 SMS(단문/장문 자동)로 발송한다.
 */

const SOLAPI_API_BASE = 'https://api.solapi.com';

/** 솔라피 규격 인증 헤더 생성. */
function authHeader(): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', serverEnv.solapiApiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${serverEnv.solapiApiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 하이픈·공백 제거 — 솔라피는 숫자만 받는다. */
function digits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export const solapiSender: NotificationSender = {
  async send(input) {
    const text = String(input.payload.text ?? '');
    if (!text || !input.to) {
      return { status: 'failed', providerResponse: { error: 'EMPTY_TEXT_OR_RECIPIENT' } };
    }

    try {
      const res = await fetch(`${SOLAPI_API_BASE}/messages/v4/send`, {
        method: 'POST',
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            to: digits(input.to),
            from: digits(serverEnv.solapiSender),
            text,
          },
        }),
      });
      const body = (await res.json()) as Record<string, unknown>;
      // 단건 접수 성공은 statusCode '2000'(또는 '2xxx'). 미존재 시 HTTP 상태로 판정.
      const code = body.statusCode != null ? String(body.statusCode) : '';
      const ok = res.ok && (code === '' || code.startsWith('2'));
      return { status: ok ? 'sent' : 'failed', providerResponse: body };
    } catch (error) {
      return { status: 'failed', providerResponse: { error: String(error) } };
    }
  },
};
