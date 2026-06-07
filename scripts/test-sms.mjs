// 솔라피 SMS 실발송 점검. 코드의 어댑터(lib/notifications/providers/solapi.ts)와
// 동일한 HMAC 인증으로 실제 문자를 보내 키·발신번호·잔액이 유효한지 검증한다.
// 실제 발송이므로 과금된다(SMS ~20원, 장문이면 LMS ~40원).
//
// 실행: node --env-file=.env.local scripts/test-sms.mjs [수신번호]
//   수신번호 생략 시 ADMIN_NOTIFY_PHONE 으로 발송.
import { createHmac, randomBytes } from 'node:crypto';

const apiKey = process.env.SOLAPI_API_KEY;
const apiSecret = process.env.SOLAPI_API_SECRET;
const sender = process.env.SOLAPI_SENDER;
const to = process.argv[2] || process.env.ADMIN_NOTIFY_PHONE;

const digits = (s) => (s || '').replace(/\D/g, '');

if (!apiKey || !apiSecret || !sender) {
  console.error('환경변수 누락: SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER (.env.local 확인)');
  process.exit(1);
}
if (!to) {
  console.error('수신번호가 없습니다. 사용법: node --env-file=.env.local scripts/test-sms.mjs 01012345678');
  process.exit(1);
}

// 솔라피 규격 인증 헤더: signature = HMAC-SHA256(date + salt, apiSecret) hex
const date = new Date().toISOString();
const salt = randomBytes(32).toString('hex');
const signature = createHmac('sha256', apiSecret).update(date + salt).digest('hex');
const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

const text = '[알펜시아 BBQ] 발송 점검 테스트입니다. 이 문자가 보이면 SMS 연동이 정상입니다.';

console.log(`발신 ${digits(sender)} → 수신 ${digits(to)} 발송 시도...`);

const res = await fetch('https://api.solapi.com/messages/v4/send', {
  method: 'POST',
  headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: { to: digits(to), from: digits(sender), text } }),
});
const body = await res.json();

console.log('HTTP', res.status);
console.log(JSON.stringify(body, null, 2));

const code = body.statusCode != null ? String(body.statusCode) : '';
const ok = res.ok && (code === '' || code.startsWith('2'));
if (ok) {
  console.log('\n✅ 접수 성공. 잠시 후 수신 문자를 확인하세요.');
} else {
  console.error(
    '\n❌ 발송 실패. 위 statusCode/statusMessage로 원인 확인.' +
      '\n   자주 나오는 원인: 발신번호 미등록(SOLAPI_SENDER), 캐시 잔액 부족, API 키/시크릿 오류.',
  );
  process.exit(1);
}
