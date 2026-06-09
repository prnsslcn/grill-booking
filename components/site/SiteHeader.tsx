'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FACILITIES } from '@/lib/facilities';

/**
 * 사이트 헤더. 3분할 레이아웃: 좌측 로고 · 중앙 메뉴(시설안내 드롭다운) · 우측 예약 CTA.
 * 데스크탑은 hover 드롭다운, 모바일은 햄버거 → 풀스크린 슬라이드 메뉴.
 *
 * overlayHero: 히어로 영상 위에선 배경 투명, 히어로 끝(센티넬)이 최상단에 닿으면 배경이 차오른다.
 */
export function SiteHeader({ overlayHero = false }: { overlayHero?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [solid, setSolid] = useState(!overlayHero);

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

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        solid ? 'bg-surface/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-24 max-w-6xl items-center px-5">
        {/* 좌: 로고 */}
        <div className="flex flex-1 items-center">
          <Link href="/" className="font-display text-5xl tracking-wide text-ink">
            Alpensia BBQ
          </Link>
        </div>

        {/* 중앙: 데스크탑 메뉴 */}
        <nav className="hidden items-center gap-8 text-[17px] font-medium md:flex">
          <div
            className="relative"
            onMouseEnter={() => setFacilityOpen(true)}
            onMouseLeave={() => setFacilityOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 py-2 text-ink transition-colors hover:text-muted"
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
                {FACILITIES.map((f) => (
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
            href="/booking/lookup"
            className="py-2 text-ink transition-colors hover:text-muted"
          >
            예약조회
          </Link>
        </nav>

        {/* 우: CTA + 모바일 햄버거 */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <Link
            href="/booking"
            className="hidden rounded-2xl bg-brand px-6 py-3 text-[17px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-strong md:inline-flex"
          >
            예약하기
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
            aria-label="메뉴 열기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 top-0 rounded-b-3xl bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-3xl tracking-wide text-ink">Alpensia BBQ</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink"
                aria-label="메뉴 닫기"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-1">
              <p className="px-3 pb-1 text-xs font-semibold text-subtle">시설안내</p>
              {FACILITIES.map((f) => (
                <Link
                  key={f.slug}
                  href={`/facilities/${f.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-brand-soft"
                >
                  <span className="font-medium text-ink">{f.label}</span>
                  <span className="text-xs text-subtle">{f.tagline}</span>
                </Link>
              ))}
              <Link
                href="/booking/lookup"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-3 font-medium text-ink hover:bg-brand-soft"
              >
                예약조회
              </Link>
            </div>

            <Link
              href="/booking"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block rounded-2xl bg-brand px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              예약하기
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
