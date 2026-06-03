import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/env.public';
import type { Database } from '@/types/database';

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * anon 키 사용 → RLS 정책의 적용을 받는다(고객 권한).
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
