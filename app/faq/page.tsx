import type { Metadata } from 'next';

import { FaqAccordion } from '@/components/site/FaqAccordion';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export const metadata: Metadata = {
  title: '자주 묻는 질문 — 알펜시아 BBQ',
  description: '운영 시간, 포함 사항, 고기 세트, 환불 규정 등 알펜시아 BBQ 예약 전 자주 묻는 질문.',
};

export default function FaqPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <FaqAccordion />
      </main>
      <SiteFooter />
    </div>
  );
}
