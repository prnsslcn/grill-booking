import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/env.public';
import type { Database } from '@/types/database';

/**
 * 서버 컴포넌트/route handler용 Supabase 클라이언트.
 * anon 키 + 쿠키 기반 세션 → RLS 적용을 받는다(로그인 사용자/관리자 세션 반영).
 *
 * 주의: 결제 검증·예약 생성 등 RLS를 우회해야 하는 작업은 이 클라이언트가 아니라
 * lib/supabase/admin.ts(서비스 롤)를 쓴다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // 서버 컴포넌트에서 호출되면 set이 막힐 수 있다.
            // 세션 갱신은 middleware에서 처리하므로 여기서는 무시 가능.
          }
        },
      },
    },
  );
}
