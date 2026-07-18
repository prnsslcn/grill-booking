'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { visibleFacilities } from '@/lib/facilities';

// nav 상품 리스트는 정원(4·6·8인) 오름차순으로 노출 (판매 중단 시설은 제외)
const NAV_FACILITIES = visibleFacilities().sort((a, b) => a.capacity - b.capacity);

/**
 * 사이트 헤더. 3분할 레이아웃: 좌측 로고 · 중앙 메뉴(시설안내 드롭다운) · 우측 예약 CTA.
 * 데스크탑은 hover 드롭다운, 모바일은 햄버거 → 풀스크린 슬라이드 메뉴.
 *
 * overlayHero: 히어로 영상 위에선 배경 투명, 히어로 끝(센티넬)이 최상단에 닿으면 배경이 차오른다.
 */
export function SiteHeader({
  overlayHero = false,
  heroWordmark = false,
}: {
  overlayHero?: boolean;
  heroWordmark?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [solid, setSolid] = useState(!overlayHero);
  // heroWordmark: 히어로에 큰 워드마크가 있는 페이지(홈)에선 nav 워드마크를 숨겼다가,
  // 히어로 워드마크가 화면 위로 사라지면 옆에서 슬라이드 인.
  const [wordmarkShown, setWordmarkShown] = useState(!heroWordmark);

  useEffect(() => {
    if (!overlayHero) return;
    const sentinel = document.querySelector('[data-hero-sentinel]');
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setSolid(entry.boundingClientRect.top <= 0),
      { threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [overlayHero]);

  useEffect(() => {
    if (!heroWordmark) return;
    const hero = document.querySelector('[data-hero-wordmark]');
    if (!hero) return;
    const io = new IntersectionObserver(
      // 히어로 워드마크가 화면 위로 완전히 사라졌을 때만 nav 워드마크 표시.
      ([entry]) => setWordmarkShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [heroWordmark]);

  // 모바일 메뉴 열림 시 스크롤 잠금(Lenis 정지 + body overflow 차단). 닫히면 복원.
  useEffect(() => {
    if (!mobileOpen) return;
    const lenis = window.__lenis;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* fixed 헤더 높이(pt-4 + 바 높이)만큼 레이아웃 자리 확보. 모바일 h-16 → 5rem, sm+ h-24 → 7rem */}
      <div aria-hidden className="h-20 sm:h-28" />
      {/* sticky 대신 fixed — Lenis(부드러운 스크롤)에서 sticky는 매 프레임 위치 보정으로 떨리므로 fixed 사용 */}
      <header className="fixed inset-x-0 top-0 z-40">
      <div className="relative mx-auto max-w-6xl px-4 pt-4">
        {/* 바깥 탭 → 닫기 (배경 살짝 디밍) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 z-10 bg-ink/10 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* 단일 pill — 모바일에서 메뉴가 열리면 이 pill 자체의 높이가 늘어난다.
            overflow는 visible(데스크탑 hover 드롭다운 비클리핑), 배경은 rounded로 자동 클립. */}
        <div
          className={`nav-drop-in absolute z-20 flex flex-col border px-6 transition-all duration-500 ease-out sm:px-8 ${
            mobileOpen
              ? 'inset-x-0 top-0 rounded-b-[1.5rem] border-transparent bg-surface md:inset-x-4 md:top-4 md:rounded-[1.5rem] md:border-line md:bg-surface/80 md:backdrop-blur-xl'
              : solid
                ? 'inset-x-0 top-0 rounded-b-[1.5rem] border-transparent bg-surface sm:inset-x-4 sm:top-4 sm:rounded-[1.5rem] sm:border-white/40 sm:bg-surface/70 sm:backdrop-blur-xl md:rounded-full'
                : 'inset-x-0 top-0 rounded-b-[1.5rem] border-transparent bg-surface sm:inset-x-4 sm:top-4 sm:rounded-[1.5rem] sm:border-white/30 sm:bg-surface/55 sm:backdrop-blur-xl md:rounded-full'
          }`}
        >
        {/* 바 행 (모바일 h-16, sm+ h-24) */}
        <div className="flex h-16 shrink-0 items-center sm:h-24">
        {/* 좌: 로고 (heroWordmark 페이지에선 히어로 워드마크가 사라질 때 화면 위에서 슬라이드 인) */}
        <div className="flex h-16 flex-1 items-center [clip-path:inset(0_-100vw)] sm:h-24">
          <Link
            href="/"
            className={`flex h-full items-center whitespace-nowrap font-display text-3xl tracking-wide text-wood transition-transform duration-[600ms] ease-out sm:text-5xl ${
              wordmarkShown ? '' : '-translate-y-full'
            }`}
          >
            Alpensia BBQ
          </Link>
        </div>

        {/* 중앙: 데스크탑 메뉴 (pill 칩) */}
        <nav className="hidden items-center gap-1 text-[17px] font-medium md:flex">
          <div
            className="relative"
            onMouseEnter={() => setFacilityOpen(true)}
            onMouseLeave={() => setFacilityOpen(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1 rounded-full px-4 py-2 text-ink transition-colors hover:bg-brand-soft ${
                facilityOpen ? 'bg-brand-soft' : ''
              }`}
            >
              시설안내
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {/* 드롭다운 */}
            <div
              className={`absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3 transition-all duration-200 ${
                facilityOpen
                  ? 'visible translate-y-0 opacity-100'
                  : 'invisible -translate-y-1 opacity-0'
              }`}
            >
              <div className="rounded-2xl border border-line bg-surface p-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)]">
                {NAV_FACILITIES.map((f) => (
                  <Link
                    key={f.slug}
                    href={`/facilities/${f.slug}`}
                    className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-brand-soft"
                  >
                    <span className="font-semibold text-ink">{f.label}</span>
                    <span className="text-xs text-subtle">{f.tagline}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/faq"
            className="rounded-full px-4 py-2 text-ink transition-colors hover:bg-brand-soft"
          >
            FAQ
          </Link>

          <Link
            href="/booking/lookup"
            className="rounded-full px-4 py-2 text-ink transition-colors hover:bg-brand-soft"
          >
            예약조회
          </Link>
        </nav>

        {/* 우: CTA + 모바일 햄버거 (모바일은 로고 공간 확보 위해 flex-1 해제, 데스크탑만 flex-1로 중앙 메뉴 정렬) */}
        <div className="flex items-center justify-end gap-2 md:flex-1">
          <Link
            href="/booking"
            className="hidden rounded-full bg-brand px-6 py-3 text-[17px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-strong md:inline-flex"
          >
            예약하기
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center text-ink transition-transform active:scale-90 md:hidden"
            aria-label="메뉴"
            aria-expanded={mobileOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
        </div>
        {/* 끝: 바 행 */}

        {/* 모바일 메뉴 — 같은 pill 안에서 높이가 0→auto 로 늘어남(pill 자체가 길어짐).
            overflow-hidden 으로 위에서부터 펼쳐지듯 보인다. */}
        <AnimatePresence initial={false}>
          {mobileOpen && (
            <motion.div
              className="overflow-hidden md:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { type: 'spring', stiffness: 380, damping: 38 },
                opacity: { duration: 0.18 },
              }}
            >
              <div className="pb-5 pt-2">
                <div className="divide-y divide-ink/15">
                  {/* 시설안내 (3개) */}
                  <div className="pb-2">
                    <p className="px-3 pb-1 text-xs font-semibold text-subtle">시설안내</p>
                    <div className="space-y-0.5">
                      {NAV_FACILITIES.map((f) => (
                        <Link
                          key={f.slug}
                          href={`/facilities/${f.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-between rounded-2xl px-3 py-3 transition-colors active:bg-brand-soft"
                        >
                          <span className="font-medium text-ink">{f.label}</span>
                          <span className="text-xs text-subtle">{f.tagline}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* FAQ */}
                  <div className="py-1">
                    <Link
                      href="/faq"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-2xl px-3 py-3 font-medium text-ink transition-colors active:bg-brand-soft"
                    >
                      FAQ
                    </Link>
                  </div>

                  {/* 예약조회 */}
                  <div className="py-1">
                    <Link
                      href="/booking/lookup"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-2xl px-3 py-3 font-medium text-ink transition-colors active:bg-brand-soft"
                    >
                      예약조회
                    </Link>
                  </div>
                </div>

                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 block rounded-2xl bg-brand px-5 py-3.5 text-center font-semibold text-white transition-colors active:bg-brand-strong"
                >
                  예약하기
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
      </header>
    </>
  );
}
