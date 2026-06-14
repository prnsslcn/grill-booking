'use client';

import { motion } from 'framer-motion';

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * 준비 중 페이지 히어로 — FacilityGallery 헤드라인과 동일한 슬라이드인 애니메이션
 * (좌측에서 x/scale/opacity) + "준비 중입니다".
 */
export function FacilitySoon({ name, oneLine = false }: { name: string; oneLine?: boolean }) {
  const lines = oneLine ? [name] : name.split(' ').filter(Boolean);

  return (
    <div className="flex flex-col items-center">
      <h1 className="sr-only">{name}</h1>
      {lines.map((w, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="headline text-1 text-1--carousel whitespace-nowrap"
          initial={{ opacity: 0, x: -800, scale: 1.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.5, delay: i * 0.12, ease: REVEAL_EASE }}
        >
          {w}
        </motion.div>
      ))}
      <motion.p
        className="mt-8 text-2xl font-semibold text-muted sm:text-3xl"
        initial={{ opacity: 0, x: -400, scale: 1.4 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 1.5, delay: lines.length * 0.12 + 0.16, ease: REVEAL_EASE }}
      >
        준비 중입니다
      </motion.p>
      <motion.p
        className="mt-3 text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: lines.length * 0.12 + 0.4 }}
      >
        더 나은 모습으로 곧 찾아뵙겠습니다.
      </motion.p>
    </div>
  );
}
