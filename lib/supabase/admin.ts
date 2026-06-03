import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env';
import { publicEnv } from '@/lib/env.public';
import type { Database } from '@/types/database';

/**
 * 서비스 롤 Supabase 클라이언트 — RLS를 우회한다.
 *
 * `import 'server-only'` 가드: 클라이언트 번들 유입 시 빌드 실패.
 * 오직 서버 라우트/관리자 로직에서만 사용한다:
 *   - 예약 생성(슬롯 선점 트랜잭션)
 *   - 토스 결제 승인 재검증 후 예약 확정
 *   - 환불 처리, 관리자 운영 작업
 *
 * 일반 고객 흐름에서 함부로 쓰면 RLS 보호가 무력화되므로, 사용처를 엄격히 제한한다.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
