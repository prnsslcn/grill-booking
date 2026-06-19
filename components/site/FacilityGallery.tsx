'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValueEvent,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
const GENIE_EASE = [0.32, 0.72, 0, 1] as const;

type Rect = { left: number; top: number; width: number; height: number };
type OpenState = { index: number; fromRect: Rect; toRect: Rect } | null;

// 기본 이미지(시설 상세 임시). images prop으로 교체 가능.
const DEFAULT_IMAGES = Array.from({ length: 9 }, () => '/images/grill.png');

// 각 카드가 자체 spring 으로 x 를 추적 — index 가 커질수록 stiffness 변화 → "신호 출발" lag
function CarouselCard({
  src,
  i,
  total,
  x,
  direction,
  alt,
  onClick,
}: {
  src: string;
  i: number;
  total: number;
  x: MotionValue<number>;
  direction: 'down' | 'up';
  alt: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>, i: number) => void;
}) {
  // index 비율 기반 stiffness 그라디언트 → "신호 출발" lag (양방향 spread)
  const stiffMax = 200;
  const stiffMin = 100;
  const span = Math.max(1, total - 1);
  const stiffness =
    direction === 'down'
      ? stiffMax - (i / span) * (stiffMax - stiffMin)
      : stiffMin + (i / span) * (stiffMax - stiffMin);
  const damping = 40;
  const cardX = useSpring(x, { stiffness, damping, mass: 1 });
  return (
    <motion.button
      type="button"
      className="carousel-card carousel-card--interactive"
      data-card-index={i}
      aria-label={`${alt} 사진 ${i + 1} 자세히 보기`}
      onClick={(e) => onClick(e, i)}
      style={
        {
          x: cardX,
          // 헤드라인 슬라이드인보다 살짝 늦게(500ms 후부터) 카드가 차례로 등장
          ['--carousel-enter-delay' as string]: `${500 + i * 50}ms`,
        } as unknown as React.CSSProperties
      }
    >
      <div className="carousel-card-shell">
        <Image
          src={src}
          alt={`${alt} ${i + 1}`}
          fill
          sizes="(max-width: 768px) 240px, 373px"
          quality={90}
          className="object-cover"
          draggable={false}
        />
      </div>
    </motion.button>
  );
}

export function FacilityGallery({
  name,
  tagline = '',
  oneLine = false,
  images,
  headline = true,
}: {
  name: string;
  tagline?: string;
  oneLine?: boolean;
  images?: string[];
  headline?: boolean;
}) {
  const IMAGES = images ?? DEFAULT_IMAGES;
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const headlineInView = useInView(headlineRef, { once: true, margin: '0px 0px -15% 0px' });
  const [trackOverflow, setTrackOverflow] = useState(0);
  const [outerHeight, setOuterHeight] = useState('300vh');
  const [openState, setOpenState] = useState<OpenState>(null);

  // 시설명을 한 줄(oneLine) 또는 공백 단위로 나눠 한 줄씩 슬라이드인(원본 FTD/Training 구조 차용)
  const lines = oneLine ? [name] : name.split(' ').filter(Boolean);

  function handleCardClick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    const fromRect = img.getBoundingClientRect();

    const natW = img.naturalWidth || fromRect.width;
    const natH = img.naturalHeight || fromRect.height;
    const natAR = natW / natH;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = vw * 0.92;
    const maxH = vh * 0.88;
    let targetW = maxW;
    let targetH = maxW / natAR;
    if (targetH > maxH) {
      targetH = maxH;
      targetW = maxH * natAR;
    }
    const toRect: Rect = {
      left: (vw - targetW) / 2,
      top: (vh - targetH) / 2,
      width: targetW,
      height: targetH,
    };

    setOpenState({
      index: i,
      fromRect: {
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
      },
      toRect,
    });
  }

  // 팝업 열려있을 때 Lenis 잠금 + ESC 닫기
  useEffect(() => {
    if (!openState) {
      window.__lenis?.start();
      return;
    }
    window.__lenis?.stop();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenState(null);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.__lenis?.start();
    };
  }, [openState]);

  // Track overflow + outer height 측정 (vertical 1px = horizontal 1px)
  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      if (!track) return;
      const cards = track.querySelectorAll<HTMLElement>('.carousel-card');
      if (!cards.length) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pageGutter =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--page-gutter'),
        ) || 80;
      let maxRight = 0;
      cards.forEach((c) => {
        const right = c.offsetLeft + c.offsetWidth;
        if (right > maxRight) maxRight = right;
      });
      const overflow = Math.max(0, maxRight - vw + pageGutter);
      setTrackOverflow(overflow);
      // outer height = vh + 가로 overflow → 카드 pin 동안 가로 진행 1:1 속도
      setOuterHeight(`${vh + overflow}px`);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });
  // 카드 pin(sticky) 동안 가로 스크롤(translateX) 진행. 세로 parallax 없음 —
  // pin 전엔 헤드라인과 카드가 같은 속도로 자연스럽게 함께 스크롤된다.
  const x = useTransform(scrollYProgress, [0, 1], [0, -trackOverflow]);

  const [direction, setDirection] = useState<'down' | 'up'>('down');
  useMotionValueEvent(x, 'change', () => {
    const vel = x.getVelocity();
    if (vel < 0) setDirection((p) => (p === 'down' ? p : 'down'));
    else if (vel > 0) setDirection((p) => (p === 'up' ? p : 'up'));
  });

  // Entrance — IntersectionObserver 로 entered 클래스, 마지막 카드 transitionend 후 hoverable 부여
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let entered = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entered) return;
        entered = true;
        observer.disconnect();
        container.classList.add('carousel-container-entered');

        const cards = container.querySelectorAll<HTMLElement>('.carousel-card');
        const lastShell = cards[cards.length - 1]?.querySelector<HTMLElement>('.carousel-card-shell');
        if (!lastShell) return;
        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== 'transform') return;
          lastShell.removeEventListener('transitionend', onEnd);
          container.querySelectorAll('.carousel-card-shell').forEach((s) => {
            s.classList.add('carousel-card-hoverable');
          });
        };
        lastShell.addEventListener('transitionend', onEnd);
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="carousel-section">
      {/* Headline — 좌측에서 슬라이드 (headline=false면 생략) */}
      {headline && (
      <div ref={headlineRef} className="carousel-headline-stack">
        <h2 className="sr-only">{name}</h2>
        {lines.map((w, i) => (
          <motion.div
            key={i}
            aria-hidden
            className="headline text-1 text-1--carousel"
            initial={{ opacity: 0, x: -800, scale: 1.8 }}
            animate={headlineInView ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{ duration: 1.5, delay: i * 0.12, ease: REVEAL_EASE }}
          >
            {w}
          </motion.div>
        ))}
        <motion.p
          className="carousel-tagline text-5"
          initial={{ opacity: 0, x: -400, scale: 1.4 }}
          animate={headlineInView ? { opacity: 1, x: 0, scale: 1 } : {}}
          transition={{ duration: 1.5, delay: lines.length * 0.12 + 0.16, ease: REVEAL_EASE }}
        >
          {tagline}
        </motion.p>
      </div>
      )}

      {/* Sticky horizontal scroll */}
      <div ref={outerRef} style={{ height: outerHeight, position: 'relative' }}>
        <div ref={containerRef} className="carousel-container" data-layout="carousel">
          <div ref={trackRef} className="carousel-track">
            {IMAGES.map((src, i) => (
              <CarouselCard
                key={i}
                src={src}
                i={i}
                total={IMAGES.length}
                x={x}
                direction={direction}
                alt={name}
                onClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Genie 팝업 — 클릭한 카드 위치에서 fullscreen 확장 */}
      <AnimatePresence>
        {openState && (
          <>
            <motion.div
              key="genie-bg"
              className="cursor-close-x fixed inset-0 z-[400] bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: GENIE_EASE }}
              onClick={() => setOpenState(null)}
            />
            <motion.div
              key={`genie-frame-${openState.index}`}
              className="pointer-events-auto fixed z-[401] cursor-default overflow-hidden shadow-2xl"
              initial={{
                left: openState.fromRect.left,
                top: openState.fromRect.top,
                width: openState.fromRect.width,
                height: openState.fromRect.height,
                borderRadius: 24,
              }}
              animate={{
                left: openState.toRect.left,
                top: openState.toRect.top,
                width: openState.toRect.width,
                height: openState.toRect.height,
                borderRadius: 16,
              }}
              exit={{
                left: openState.fromRect.left,
                top: openState.fromRect.top,
                width: openState.fromRect.width,
                height: openState.fromRect.height,
                borderRadius: 24,
              }}
              transition={{ duration: 0.55, ease: GENIE_EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={IMAGES[openState.index]}
                alt={`${name} ${openState.index + 1}`}
                fill
                sizes="100vw"
                quality={90}
                className="object-cover"
                draggable={false}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
