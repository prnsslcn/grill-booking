import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FacilitySoon } from '@/components/site/FacilitySoon';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { FACILITIES, facilityBySlug } from '@/lib/facilities';

// 준비 중인 시설만 사전 생성
export function generateStaticParams() {
  return FACILITIES.filter((f) => f.comingSoon).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = facilityBySlug(slug);
  if (!f) return {};
  return { title: `${f.label} — 준비 중 · 알펜시아 BBQ` };
}

// 준비 중(임시) 페이지: 상세 갤러리 대신 동일한 헤드라인 + "준비 중입니다".
export default async function FacilitySoonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = facilityBySlug(slug);
  if (!f) notFound();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        {/* 갤러리와 동일한 헤드라인 슬라이드인 애니메이션 + "준비 중입니다" */}
        <FacilitySoon name={f.label} oneLine={f.headlineOneLine} />
      </main>
      <SiteFooter />
    </div>
  );
}
