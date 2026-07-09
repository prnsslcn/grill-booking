import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { FacilityGallery } from '@/components/site/FacilityGallery';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { FACILITIES, facilityBySlug, isHiddenFacilityType, meatGrams } from '@/lib/facilities';
import { BEEF_ENABLED } from '@/lib/config';
import { formatWon } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 60;

export function generateStaticParams() {
  // 준비 중·판매 중단 시설은 상세를 사전 생성하지 않음
  return FACILITIES.filter((f) => !f.comingSoon && !isHiddenFacilityType(f.type)).map((f) => ({
    slug: f.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = facilityBySlug(slug);
  if (!f) return {};
  return {
    title: `${f.label} — 알펜시아 BBQ`,
    description: `${f.label}(${f.tagline}) — ${f.intro.slice(0, 80)}`,
  };
}

async function getPrices(type: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('price_pork, price_beef, is_active')
    .eq('type', type)
    .maybeSingle();
  return data;
}

export default async function FacilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = facilityBySlug(slug);
  if (!f || isHiddenFacilityType(f.type)) notFound();
  if (f.comingSoon) redirect(`/facilities/${f.slug}/soon`);

  const prices = await getPrices(f.type);
  const others = FACILITIES.filter((o) => o.slug !== f.slug && !isHiddenFacilityType(o.type));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <SiteHeader />

      <main className="flex-1">
        {/* 헤드라인 + 가로 스크롤 이미지 갤러리 (홈 히어로 설명 블록 대체) */}
        <FacilityGallery name={f.label} tagline={f.intro} oneLine={f.headlineOneLine} images={f.images} />

        {/* 특징 */}
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">이런 점이 좋아요</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {f.features.map((feat) => (
                <div key={feat.title} className="rounded-2xl border border-line bg-canvas p-6">
                  <h3 className="font-bold text-ink">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 가격 + 예약 CTA */}
        <section className="py-16 bg-surface">
          <div className="mx-auto max-w-5xl px-5">
            <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">{f.label} 가격</h2>
                <p className="mt-1 text-sm text-muted">
                  고기세트 포함 · 전액 선결제 · 기준 {f.capacity}인 (1인 150g)
                </p>
                <div className="mt-5 space-y-1.5">
                  {prices && prices.is_active ? (
                    <>
                      <div className="flex items-baseline gap-6">
                        <span className="w-16 text-sm text-muted">Pork Set</span>
                        <span className="text-lg font-bold text-ink">
                          {formatWon(prices.price_pork)}
                        </span>
                        <span className="text-sm text-subtle">{meatGrams(f.capacity)}g</span>
                      </div>
                      {BEEF_ENABLED && (
                        <div className="flex items-baseline gap-6">
                          <span className="w-16 text-sm text-muted">Beef Set</span>
                          <span className="text-lg font-bold text-ink">
                            {formatWon(prices.price_beef)}
                          </span>
                          <span className="text-sm text-subtle">{meatGrams(f.capacity)}g</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-subtle">현재 예약을 받지 않는 시설입니다.</p>
                  )}
                </div>
              </div>
              <Link
                href={`/booking?facility=${f.type}`}
                className="inline-flex justify-center rounded-2xl bg-brand px-7 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-strong"
              >
                예약하기
              </Link>
            </div>
          </div>
        </section>

        {/* 다른 시설 */}
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">다른 시설</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/facilities/${o.slug}`}
                  className={`group flex items-center justify-between rounded-3xl border border-line bg-surface p-7 text-ink transition duration-300 hover:-translate-y-1.5 ${o.heroHover}`}
                >
                  <div>
                    <p className="text-sm font-semibold opacity-70">{o.tagline}</p>
                    <h3 className="mt-1 text-2xl font-bold">{o.label}</h3>
                  </div>
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center opacity-80 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M7 17L17 7M17 7H8.5M17 7V15.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
