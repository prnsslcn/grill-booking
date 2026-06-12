import type Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

// 스티키 헤더(h-24 = 96px) 아래로 가려지지 않게 여백을 둔다.
const HEADER_OFFSET = 96;

/**
 * id 엘리먼트로 부드럽게 스크롤. Lenis가 있으면 Lenis로(헤더 오프셋 적용),
 * 없으면(접근성 reduced-motion 등) 네이티브 scrollIntoView로 폴백한다.
 */
export function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const lenis = typeof window !== 'undefined' ? window.__lenis : undefined;
  if (lenis) {
    lenis.scrollTo(target, { offset: -HEADER_OFFSET });
  } else {
    // scroll-mt-* (CSS scroll-margin-top)로 헤더 여백 처리됨.
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
