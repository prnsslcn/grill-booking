'use client';

import { useEffect, useState } from 'react';

// 임시 랜딩 헤더 — 예약 nav 없이 워드마크 슬라이드인(SiteHeader 로직 차용) + 전화 예약 CTA.
const PHONE = '010-3045-2994';
const TEL = 'tel:01030452994';

export function TempHeader() {
  // 히어로의 큰 워드마크가 화면 위로 사라지면 nav 워드마크가 위에서 슬라이드 인.
  const [wordmarkShown, setWordmarkShown] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-hero-wordmark]');
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setWordmarkShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <span
          className={`whitespace-nowrap font-display text-2xl tracking-wide text-wood transition-all duration-[600ms] ease-out sm:text-3xl ${
            wordmarkShown ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0'
          }`}
        >
          Alpensia BBQ
        </span>
        <a
          href={TEL}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-strong sm:px-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6.5 3h3l1.5 5-2 1.5a11 11 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">전화 예약 </span>
          {PHONE}
        </a>
      </div>
    </header>
  );
}
