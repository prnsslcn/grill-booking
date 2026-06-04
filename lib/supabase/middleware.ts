import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/lib/env.public';

/**
 * 매 요청마다 Supabase 세션 토큰을 갱신해 쿠키에 반영한다.
 * 서버 컴포넌트/액션이 최신 세션을 읽을 수 있게 하는 표준 패턴.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser()가 토큰 갱신을 트리거한다. 호출 자체가 목적.
  await supabase.auth.getUser();

  return response;
}
