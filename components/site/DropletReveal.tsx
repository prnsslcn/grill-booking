'use client';

import type { ReactNode } from 'react';

import { Reveal } from '@/components/ui/Reveal';

/**
 * 물방울 등장 — scale 0.85→1 + 페이드, 부드러운 이징. 뷰포트 진입 시 발동, 자식 stagger는 delay로.
 * (홈 헤드라인·카드와 동일 파라미터. prefers-reduced-motion은 Reveal이 처리)
 */
export function DropletReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal
      from={{ scale: 0.85, y: 0 }}
      duration={0.5}
      ease="cubic-bezier(0.22,1,0.36,1)"
      delay={delay}
      className={className}
    >
      {children}
    </Reveal>
  );
}
