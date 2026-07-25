'use client';

import { useEffect } from 'react';
import { registerHyperellipse } from 'hyperellipse';

/**
 * CSS `corner-shape` 폴리필 초기화. 크롬 등 네이티브 지원 브라우저는 CSS 브리지만 주입되어
 * 네이티브 렌더(JS 옵저버 미실행), 사파리·파이어폭스는 clip-path/SVG 폴백으로 스퀴클을 그린다.
 * `.squircle` 유틸(= --corner-shape: squircle)이 붙은 요소에만 적용된다.
 */
export function SquircleProvider() {
  useEffect(() => {
    const controller = registerHyperellipse();
    return () => controller.destroy();
  }, []);
  return null;
}
