'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const PHONE = '010-3045-2994';
const TEL = 'tel:01030452994';

/**
 * 홈 진입 안내 팝업 — "홈페이지 준비 중, 전화로 예약" 유도. 매 방문마다 노출(저장 없음).
 * 정식 오픈 시 app/page.tsx 에서 <NoticePopup /> 한 줄(+import)만 제거하면 철회된다.
 */
export function NoticePopup() {
  const [open, setOpen] = useState(true);

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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-5">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="안내"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-7 text-center shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-line-soft text-subtle transition-colors hover:bg-line hover:text-muted"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                {/* 눈 */}
                <path
                  d="M9 10.5h.01M15 10.5h.01"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* 찡그린 입(frown) */}
                <path
                  d="M8.5 16Q12 13.4 15.5 16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-ink">온라인 예약 준비 중입니다</h2>
            <p className="mt-2 leading-relaxed text-muted">
              홈페이지를 준비하고 있습니다.
              <br />
              예약·문의는 전화로 편하게 연락 주세요.
            </p>

            <a
              href={TEL}
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-brand-strong"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6.5 3h3l1.5 5-2 1.5a11 11 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              {PHONE}
            </a>
            <p className="mt-3 text-sm text-subtle">상담 시간 11:00 ~ 19:00</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
