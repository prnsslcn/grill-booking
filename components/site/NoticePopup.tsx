'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * 홈 진입 안내 팝업 — 고객 혼란이 잦은 핵심 2가지(당일 13:00 마감 · 성수기 주중 운영)를 강조.
 * '오늘 하루 보지 않기'는 localStorage(날짜)로 저장해 당일엔 재노출하지 않는다.
 * 철회 시 app/page.tsx 에서 <NoticePopup /> 한 줄(+import)만 제거.
 */

const STORAGE_KEY = 'notice-dismissed-date';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function NoticePopup() {
  const [open, setOpen] = useState(false);

  // 최초 마운트 시: 오늘 '보지 않기' 했으면 열지 않음(깜빡임 방지 위해 false로 시작 후 판정).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== todayKey()) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  // 열린 동안 스크롤 잠금(Lenis + body) + ESC 닫기
  useEffect(() => {
    if (!open) return;
    const lenis = window.__lenis;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function dismissToday() {
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* 저장 불가 시 이번 세션만 닫힘 */
    }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-5">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="이용 안내"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface/70 shadow-[0_28px_70px_-15px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* 헤더 밴드 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-brand/85 to-brand-strong/85 px-7 pb-7 pt-8 text-white">
              <span className="text-xs font-semibold tracking-[0.14em] text-white/75">
                알펜시아 BBQ
              </span>
              <h2 className="mt-1.5 text-[26px] font-extrabold leading-tight">
                예약 전<br />꼭 확인해 주세요
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* 핵심 안내 2가지 */}
            <div className="space-y-3 p-6">
              <div className="flex items-start gap-3.5 rounded-2xl bg-canvas/50 p-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-ink">당일 예약 13:00 마감</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    당일 예약은 <strong className="text-ink">오후 1시(13:00)까지</strong>만 가능합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-canvas/50 p-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-ink">성수기 주중에도 운영</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    평소 금·토 운영이지만, <strong className="text-ink">성수기엔 주중에도 운영</strong>합니다. (수 휴무)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissToday}
                className="mt-1 w-full py-1.5 text-center text-sm font-medium text-subtle transition-colors hover:text-muted"
              >
                오늘 하루 보지 않기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
