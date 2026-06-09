'use client';

import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';

/**
 * Lenis 부드러운 스크롤. 앱 전체를 감싸 휠/터치 스크롤을 매끄럽게 보간한다.
 * prefers-reduced-motion이면 활성화하지 않는다(접근성).
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 1,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
