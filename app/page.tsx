import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { MissionBricks } from '@/components/site/MissionBricks';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { NoticePopup } from '@/components/site/NoticePopup';
import { BEEF_ENABLED } from '@/lib/config';
import { facilityByType, isComingSoonType, isHiddenFacilityType, meatGrams } from '@/lib/facilities';
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

// 이용 안내 3카드 — 아이콘 + 항목. Reveal stagger로 순차 등장.

async function getFacilities() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, capacity, price_pork, price_beef, total_units')
    .eq('is_active', true)
    .order('capacity', { ascending: true });
  // 판매 중단(숨김) 시설 제외
  return (data ?? []).filter((f) => !isHiddenFacilityType(f.type));
}


export default async function Home() {
  const facilities = await getFacilities();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      {/* 홈페이지 준비 중 안내 팝업 — 정식 오픈 시 이 한 줄만 제거하면 철회됨 */}
      <NoticePopup />
      <SiteHeader heroWordmark />

      <main className="flex-1">
        {/* 히어로 — 중앙 헤드라인 + 그릴 이미지 */}
        <section className="relative overflow-hidden bg-surface">
          <div className="mx-auto max-w-5xl px-5 pb-16 pt-14 text-center sm:pt-20">
            {/* <span className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-muted">
              대관령 숯불 바비큐
            </span> */}
            <h1
              data-hero-wordmark
              className="mt-6 whitespace-nowrap font-display text-[clamp(2rem,10vw,6rem)] tracking-wide text-wood"
            >
              Alpensia BBQ
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted">
              대관령의 아름다운 자연 속에서 가족, 친구, 연인과 함께 프리미엄 BBQ를 즐겨보세요.
            </p>
            {/* 가운데 그릴 이미지 */}
            <div className="mx-auto mt-12 flex max-w-xl justify-center">
              <Image
                src="/images/grill.png"
                alt="숯불 그릴"
                width={706}
                height={1000}
                priority
                sizes="(max-width: 768px) 88vw, 520px"
                className="h-auto w-[88%] max-w-[520px]"
              />
            </div>
          </div>
        </section>

        {/* 시설 */}
        <section id="facilities" className="overflow-hidden bg-surface py-16 scroll-mt-24">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">시설 안내</h2>
            <p className="mt-2 text-muted">모든 상품에 고기세트가 포함됩니다.</p>
            <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-5">
              {facilities.map((f, i) => {
                const s = FACILITY_STYLE[f.type] ?? FACILITY_STYLE_DEFAULT;
                const soon = isComingSoonType(f.type);
                return (
                  <Reveal
                    key={f.type}
                    delay={i * 150}
                    from={FACILITY_FROM[i % FACILITY_FROM.length]}
                    duration={0.8}
                    ease="cubic-bezier(0.16,1,0.3,1)"
                    className="h-full w-full sm:w-auto sm:flex-1 sm:min-w-[260px] sm:max-w-[360px]"
                  >
                  <Link
                    href={facilityByType(f.type) ? `/facilities/${facilityByType(f.type)!.slug}` : '/booking'}
                    className={`group relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5 sm:min-h-[300px] sm:p-8 ${s.card}`}
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

                    {soon ? (
                      <div className="mt-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-bold text-brand-strong">
                          오픈 준비 중
                        </span>
                        <p className={`mt-3 text-xs ${s.muted}`}>곧 만나보실 수 있습니다.</p>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-sm ${s.muted}`}>Pork Set</span>
                          <span className="text-lg font-bold">{formatWon(f.price_pork)}</span>
                        </div>
                        {BEEF_ENABLED && (
                          <div className="flex items-baseline justify-between">
                            <span className={`text-sm ${s.muted}`}>Beef Set</span>
                            <span className="text-lg font-bold">{formatWon(f.price_beef)}</span>
                          </div>
                        )}
                        <p className={`pt-1 text-xs ${s.muted}`}>
                          기준 {f.capacity}인 · 세트당 {meatGrams(f.capacity)}g · {f.total_units}동
                        </p>
                      </div>
                    )}
                  </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 이용 안내 — 브릭 레이아웃 (스크롤 진입 시 좌·우·하단에서 슬라이드 인) */}
        <section className="overflow-hidden bg-surface py-12 sm:py-16">
          <MissionBricks />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
