import 'server-only';

/**
 * 서버 전용 환경변수 단일 진입점.
 *
 * `import 'server-only'` 가드: 이 모듈이 클라이언트 번들에 포함되면 빌드가 즉시 실패한다.
 * → 시크릿(서비스 롤 키, 토스 시크릿 키)이 브라우저로 새는 경로를 컴파일 단계에서 차단.
 *
 * 값은 지연(lazy) 평가한다: 모듈 import 시점이 아니라 실제 접근 시점에 검증한다.
 * → env 미설정 상태에서도 빌드/정적분석은 통과하고, 누락 시 사용하는 곳에서 명확히 터진다.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `필수 환경변수 누락: ${name}. .env.local 을 확인하세요(.env.example 참고).`,
    );
  }
  return value;
}

export const serverEnv = {
  /** Supabase 서비스 롤 키 — RLS 우회. 서버 라우트/관리자 작업 전용. */
  get supabaseServiceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** 토스페이먼츠 시크릿 키 — 결제 승인/취소 서버 API 인증용. */
  get tossSecretKey(): string {
    return required('TOSS_SECRET_KEY');
  },
} as const;
