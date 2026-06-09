'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 스크롤 진입 시 등장. 라이브러리 없이 IntersectionObserver + CSS.
 * from으로 시작 오프셋(x·y·회전·축소)을 주면 "밖에서 들어와 안착"하는 모션이 된다.
 * delay로 stagger(순차 등장), prefers-reduced-motion이면 애니메이션 없이 바로 표시.
 *
 * React state 대신 ref로 inner 엘리먼트 style을 직접 조작한다(불필요한 리렌더 없음).
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  from,
  duration = 0.7,
  ease = 'cubic-bezier(0.16,1,0.3,1)',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: { x?: number; y?: number; rotate?: number; scale?: number };
  duration?: number;
  ease?: string;
}) {
  // 외곽 div는 제자리 고정(스크롤 진입 감지용), 내부 div만 움직인다.
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const hidden = `translate(${from?.x ?? 0}px, ${from?.y ?? 28}px) rotate(${
    from?.rotate ?? 0
  }deg) scale(${from?.scale ?? 1})`;

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const reveal = () => {
      inner.style.opacity = '1';
      inner.style.transform = 'translate(0,0) rotate(0deg) scale(1)';
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveal();
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(outer);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={outerRef} className={className}>
      <div
        ref={innerRef}
        className="h-full"
        style={{
          transition: `opacity ${duration}s ease, transform ${duration}s ${ease}`,
          transitionDelay: `${delay}ms`,
          opacity: 0,
          transform: hidden,
          willChange: 'opacity, transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
