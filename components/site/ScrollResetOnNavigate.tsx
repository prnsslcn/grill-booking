'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 클라이언트 네비게이션(Link 클릭) 시 항상 최상단에서 랜딩하도록 스크롤을 리셋.
 * 인라인 scrollTo(0,0) 스크립트는 전체 로드(새로고침) 때만 돌고, SPA 이동 땐 Lenis가
 * 이전 위치를 유지하므로 pathname 변경마다 Lenis/네이티브 스크롤을 0으로 되돌린다.
 * 단, #해시로 이동한 경우(예: /#faq)는 앵커 스크롤 핸들러에 맡긴다.
 */
export function ScrollResetOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.location.hash) return;
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
