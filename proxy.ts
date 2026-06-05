import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16: 'middleware' 컨벤션이 'proxy'로 변경됨.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 정적 자산·이미지 제외, 그 외 요청에서 세션 갱신
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
