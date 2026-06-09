import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Reveal } from '@/components/ui/Reveal';
import { ScrollVideoHero } from '@/components/site/ScrollVideoHero';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { facilityByType } from '@/lib/facilities';
import { formatWon } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

// 랜딩은 ISR로 캐시(거의 정적). 가격 변경 시 관리자 액션의 revalidatePath('/')로 즉시 갱신,
// 그 외엔 60초마다 백그라운드 갱신.
export const revalidate = 60;

const FACILITY_DESC: Record<string, string> = {
  tarp_tent: '오픈형 타프 텐트에서 즐기는 숯불 바비큐',
  cabin: '프라이빗 카바나에서 아늑하게',
  outdoor_table: '간편하게 즐기는 야외 테이블 (4인)',
};

// 시설별 카드 색(브랜드 그린 계열 변주). 미정 type은 기본 연그린.
const FACILITY_STYLE: Record<string, { card: string; muted: string; arrow: string }> = {
  outdoor_table: { card: 'bg-brand-soft text-ink', muted: 'text-muted', arrow: 'text-brand' },
  tarp_tent: { card: 'bg-[#23322d] text-white', muted: 'text-white/65', arrow: 'text-white' },
  cabin: { card: 'bg-brand text-white', muted: 'text-white/75', arrow: 'text-white' },
};
const FACILITY_STYLE_DEFAULT = { card: 'bg-brand-soft text-ink', muted: 'text-muted', arrow: 'text-brand' };

// 카드별 등장 시작값 — 모두 우측 화면 밖에서 슬라이드 인. stagger로 차례로 들어온다.
const FACILITY_FROM = [
  { x: 760 },
  { x: 760 },
  { x: 760 },
];

async function getFacilities() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, capacity, price_pork, price_beef, total_units')
    .eq('is_active', true)
    .order('capacity', { ascending: true });
  return data ?? [];
}

export default async function Home() {
  const facilities = await getFacilities();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader overlayHero />

      <main className="flex-1">
        {/* 히어로 — 스크롤 스크럽 영상 */}
        <ScrollVideoHero />

        {/* 시설 */}
        <section id="facilities" className="overflow-hidden bg-surface py-16 scroll-mt-24">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">시설 안내</h2>
            <p className="mt-2 text-muted">모든 상품에 고기세트가 포함됩니다.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {facilities.map((f, i) => {
                const s = FACILITY_STYLE[f.type] ?? FACILITY_STYLE_DEFAULT;
                return (
                  <Reveal
                    key={f.type}
                    delay={i * 150}
                    from={FACILITY_FROM[i % FACILITY_FROM.length]}
                    duration={0.8}
                    ease="cubic-bezier(0.16,1,0.3,1)"
                    className="h-full"
                  >
                  <Link
                    href={facilityByType(f.type) ? `/facilities/${facilityByType(f.type)!.slug}` : '/booking'}
                    className={`group relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5 ${s.card}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-2xl font-bold leading-tight">{f.name}</h3>
                        <span
                          className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${s.arrow}`}
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
                      </div>
                      <p className={`mt-2 text-sm leading-relaxed ${s.muted}`}>
                        {FACILITY_DESC[f.type]}
                      </p>
                    </div>

                    <div className="mt-6 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm ${s.muted}`}>돼지 세트</span>
                        <span className="text-lg font-bold">{formatWon(f.price_pork)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm ${s.muted}`}>소 세트</span>
                        <span className="text-lg font-bold">{formatWon(f.price_beef)}</span>
                      </div>
                      <p className={`pt-1 text-xs ${s.muted}`}>
                        기준 {f.capacity}인 · {f.total_units}동 운영
                      </p>
                    </div>
                  </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 안내 */}
        <section className="py-16">
          <div className="mx-auto grid max-w-5xl gap-4 px-5 sm:grid-cols-3">
            <Card className="p-6">
              <h3 className="font-bold text-ink">운영 안내</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>· 운영일: 매주 금·토 (성수기 주중·동계 휴장)</li>
                <li>· 1부 17:00~19:00 / 2부 19:30~21:30</li>
                <li>· 회차당 2시간 · 100% 선결제</li>
                <li>· 예약·문의 033-339-0616 / 0664</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-ink">포함 사항</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>· 숯·석쇠·집게·식기·생수 등 기본 세팅</li>
                <li>· 상추·양파·버섯·소시지·쌈장 등 기본 식재료</li>
                <li>· 한강라면·햇반 무료 제공</li>
                <li>· 커피 쿠폰 무료 제공</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-ink">환불 규정</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>· 이용 2일 전까지: 100% 환불</li>
                <li>· 이용 1일 전: 50% 환불</li>
                <li>· 이용 당일·노쇼: 환불 불가</li>
                <li>· 우천 시 야외 테이블(4인)은 운영 제한될 수 있습니다.</li>
              </ul>
            </Card>
          </div>
          <p className="mx-auto mt-4 max-w-5xl px-5 text-sm text-subtle">
            단체 BBQ(최대 200명)는 사전 예약·문의로 진행됩니다.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
