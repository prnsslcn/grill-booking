'use client';

import { useEffect, useRef } from 'react';

/**
 * 스크롤 스크럽 히어로. 긴 트랙(높이 > 100vh) 안에서 영상을 sticky로 고정하고,
 * 트랙을 지나는 스크롤 진행도(0~1)를 video.currentTime에 1:1 매핑한다(스크롤=영상 진행).
 *
 * - 재생하지 않고 currentTime만 조작(muted/playsInline).
 * - 보간(lerp) 없이 스크롤 위치에 직접 매핑 → 멈추면 그 자리에서 정지(따라가는 느낌 제거).
 *   부드러움은 Lenis의 스크롤 이징 + 촘촘한 키프레임 영상이 담당.
 * - prefers-reduced-motion이면 스크럽 비활성(첫 프레임 고정).
 */
export function ScrollVideoHero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let duration = 0;
    let target = 0;
    let rafId = 0;

    const readDuration = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
    };
    video.addEventListener('loadedmetadata', readDuration);
    if (video.readyState >= 1) readDuration();

    // iOS Safari 대응: 제스처/재생 없이 currentTime만 바꾸면 프레임이 렌더되지 않아 검게 보인다.
    // play()→pause()로 디코더를 한 번 깨워야 스크럽 시 프레임이 그려진다(muted+playsInline은 허용).
    // 저전력 모드 등으로 play()가 거부되면 첫 사용자 입력 때 다시 시도한다.
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(() => video.pause()).catch(() => {
          primed = false; // 실패 시 다음 제스처에서 재시도
        });
      }
    };
    video.addEventListener('loadeddata', prime);
    window.addEventListener('pointerdown', prime);
    window.addEventListener('touchstart', prime, { passive: true });
    if (video.readyState >= 2) prime();

    const computeTarget = () => {
      const rect = track.getBoundingClientRect();
      // 트랙 전체 높이를 진행 구간으로 사용 → 히어로가 위로 빠지는 동안에도 영상이 진행되어
      // 다음 섹션 상단이 화면 최상단에 닿는 순간 영상이 끝난다(끝부분 정지 구간 제거).
      const total = rect.height;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const progress = total > 0 ? scrolled / total : 0;
      target = progress * duration;
    };

    const onScroll = () => computeTarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    computeTarget();

    const loop = () => {
      if (duration > 0 && video.readyState >= 1 && Math.abs(video.currentTime - target) > 0.01) {
        video.currentTime = target;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('touchstart', prime);
      video.removeEventListener('loadedmetadata', readDuration);
      video.removeEventListener('loadeddata', prime);
    };
  }, []);

  return (
    <section ref={trackRef} className="relative -mt-24 h-[260vh] w-full bg-surface">
      {/* 좌·우·아래 여백을 둬 액자처럼 가둠(위는 nav 아래 최상단까지). 상단 직각, 하단만 둥글게. */}
      <div className="sticky top-0 h-[100dvh] w-full px-6 pb-6 sm:px-20 sm:pb-20">
        <div className="relative h-full w-full overflow-hidden rounded-b-[2.5rem] bg-black">
          <video
            ref={videoRef}
            src="/videos/grill.mp4"
            poster="/videos/grill-poster.jpg"
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      {/* 히어로 끝 지점 — 화면 최상단에 닿으면 nav 배경이 차오른다(SiteHeader가 관찰). */}
      <div data-hero-sentinel className="absolute bottom-0 left-0 h-px w-full" />
    </section>
  );
}
