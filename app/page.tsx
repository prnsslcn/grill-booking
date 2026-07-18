import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { MissionBricks } from '@/components/site/MissionBricks';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
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
// overlay: 배경 사진 위에 카드색으로 위·아래는 진하게(텍스트 가독성) 가운데는 옅게(사진 노출) 덮는 그라디언트.
const FACILITY_STYLE: Record<
  string,
  { card: string; muted: string; arrow: string; overlay: string }
> = {
  outdoor_table: {
    card: 'bg-brand-soft text-ink',
    muted: 'text-muted',
    arrow: 'text-brand',
    overlay: '',
  },
  // 메인 상품 카드(홈)만: 타프·카바나 모두 딥그린 톤으로 통일(카드색·포인트색 동일).
  tarp_tent: {
    card: 'bg-[#23322d] text-white',
    muted: 'text-white/85',
    arrow: 'text-white',
    overlay: 'bg-gradient-to-b from-[#23322d]/75 via-[#23322d]/10 to-[#1b2620]/85',
  },
  cabin: {
    card: 'bg-[#23322d] text-white',
    muted: 'text-white/85',
    arrow: 'text-white',
    overlay: 'bg-gradient-to-b from-[#23322d]/75 via-[#23322d]/10 to-[#1b2620]/85',
  },
};
const FACILITY_STYLE_DEFAULT = {
  card: 'bg-brand-soft text-ink',
  muted: 'text-muted',
  arrow: 'text-brand',
  overlay: '',
};

// 카드 배경 사진(카드색 그라디언트로 자연스럽게 블렌딩). 없으면 단색 카드.
const FACILITY_IMAGE: Record<string, string> = {
  tarp_tent: '/images/facilities/tarp-tent/3.jpg',
  cabin: '/images/facilities/cabana/2.jpg',
};

// 물방울 등장 — scale 0.85→1 + 페이드, 부드러운 이징. 헤드라인·카드 공통(자식 stagger로 순차).
const DROPLET = {
  from: { scale: 0.85, y: 0 },
  duration: 0.5,
  ease: 'cubic-bezier(0.22,1,0.36,1)',
} as const;

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
      <SiteHeader heroWordmark />

      <main className="flex-1">
        {/* 히어로 — 좌: 헤드라인/설명, 우: 그릴 이미지 (모바일은 세로 스택) */}
        <section className="relative overflow-hidden bg-surface">
          <div className="mx-auto max-w-6xl px-5 pb-8 pt-14 sm:pt-16">
            <div className="text-center">
              <Reveal delay={0} from={DROPLET.from} duration={DROPLET.duration} ease={DROPLET.ease}>
                <h1
                  data-hero-wordmark
                  className="whitespace-nowrap font-display text-[clamp(1.75rem,8vw,5rem)] tracking-wide text-wood"
                >
                  Alpensia BBQ
                </h1>
              </Reveal>
              <Reveal delay={110} from={DROPLET.from} duration={DROPLET.duration} ease={DROPLET.ease}>
                <p className="mt-6 text-base leading-relaxed text-muted sm:text-xl">
                  대관령의 아름다운 자연 속에서 가족, 친구, 연인과 함께 프리미엄 BBQ를 즐겨보세요.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 시설 */}
        <section id="facilities" className="overflow-hidden bg-surface py-16 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-5">
              {facilities.map((f, i) => {
                const s = FACILITY_STYLE[f.type] ?? FACILITY_STYLE_DEFAULT;
                const soon = isComingSoonType(f.type);
                return (
                  <Reveal
                    key={f.type}
                    delay={220 + i * 110}
                    from={DROPLET.from}
                    duration={DROPLET.duration}
                    ease={DROPLET.ease}
                    className="w-full sm:w-auto sm:flex-1 sm:min-w-[300px] sm:max-w-[560px]"
                  >
                  <Link
                    href={facilityByType(f.type) ? `/facilities/${facilityByType(f.type)!.slug}` : '/booking'}
                    className={`group relative flex aspect-[4/3] w-full flex-col justify-between overflow-hidden rounded-[2.5rem] p-7 transition-transform duration-300 hover:-translate-y-1.5 sm:p-8 ${s.card}`}
                  >
                    {FACILITY_IMAGE[f.type] && (
                      <>
                        <Image
                          src={FACILITY_IMAGE[f.type]}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 420px"
                          className="pointer-events-none absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className={`pointer-events-none absolute inset-0 ${s.overlay}`} />
                      </>
                    )}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-2xl font-bold leading-tight drop-shadow-sm sm:text-3xl">{f.name}</h3>
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
                      <div className="relative z-10 mt-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-bold text-brand-strong">
                          오픈 준비 중
                        </span>
                        <p className={`mt-3 text-xs ${s.muted}`}>곧 만나보실 수 있습니다.</p>
                      </div>
                    ) : (
                      <div className="relative z-10 mt-6 space-y-1.5">
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
