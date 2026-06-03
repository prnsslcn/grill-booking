/**
 * 클라이언트 안전(NEXT_PUBLIC_) 환경변수 단일 진입점.
 *
 * server-only 가드를 두지 않는다 — 이 값들은 브라우저 노출이 전제다.
 * 시크릿은 절대 여기 두지 않는다(시크릿은 lib/env.ts).
 *
 * NEXT_PUBLIC_* 참조는 Next 빌드 시 리터럴로 인라인된다. 지연 getter로 감싸
 * 미설정 시 사용 시점에 명확한 에러를 던진다.
 */

function requiredPublic(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `필수 공개 환경변수 누락: ${name}. .env.local 을 확인하세요(.env.example 참고).`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl(): string {
    return requiredPublic(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey(): string {
    return requiredPublic(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get tossClientKey(): string {
    return requiredPublic(
      'NEXT_PUBLIC_TOSS_CLIENT_KEY',
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
    );
  },
} as const;
