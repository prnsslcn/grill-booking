import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { facilityByType, meatGrams } from '@/lib/facilities';
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
const INFO = [
  {
    title: '운영 안내',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.5V12l3 1.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    items: [
      '운영일: 매주 금·토 (성수기 주중·동계 휴장)',
      '1부 17:00~19:00 / 2부 19:30~21:30',
      '회차당 2시간 · 100% 선결제',
      '예약·문의 010-3045-2994',
    ],
  },
  {
    title: '포함 사항',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l8 4v10l-8 4-8-4V7l8-4z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M4 7l8 4 8-4M12 11v10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
    items: [
      '고기세트(정원 기준 1인 150g) 포함',
      '숯·석쇠·집게·식기·생수 등 기본 세팅',
      '상추·양파·버섯·소시지·쌈장 등 기본 식재료',
      '한강라면·햇반, 커피 쿠폰 무료 제공',
    ],
  },
  {
    title: '환불 규정',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5c0 4.4-3 7.4-7 8.9C8 17.4 5 14.4 5 10V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 11.5l2 2 3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    items: [
      '이용 2일 전까지: 100% 환불',
      '이용 1일 전: 50% 환불',
      '이용 당일·노쇼: 환불 불가',
      '우천 시 야외 테이블(4인)은 운영 제한될 수 있습니다.',
    ],
  },
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
              className="mt-6 whitespace-nowrap font-display text-5xl tracking-wide text-wood sm:text-8xl"
            >
              Alpensia BBQ
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted">
              대관령의 아름다운 자연 속에서 가족, 친구, 연인과 함께 프리미엄 야외 BBQ를 즐겨보세요.
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
                        <span className={`text-sm ${s.muted}`}>Pork Set</span>
                        <span className="text-lg font-bold">{formatWon(f.price_pork)}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm ${s.muted}`}>Beef Set</span>
                        <span className="text-lg font-bold">{formatWon(f.price_beef)}</span>
                      </div>
                      <p className={`pt-1 text-xs ${s.muted}`}>
                        기준 {f.capacity}인 · 세트당 {meatGrams(f.capacity)}g · {f.total_units}동
                      </p>
                    </div>
                  </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 이용 안내 — 운영/포함/환불 + 단체 배너 */}
        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-5xl px-5">
            <Reveal from={{ y: 24 }}>
              <h2 className="text-2xl font-bold text-ink">이용 안내</h2>
              <p className="mt-2 text-muted">운영·포함·환불 등 예약 전 핵심 정보입니다.</p>
            </Reveal>

            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {INFO.map((c, i) => (
                <Reveal key={c.title} delay={i * 120} from={{ y: 40 }} duration={0.8} className="h-full">
                  <div className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/30 hover:shadow-[0_22px_48px_-22px_rgba(0,0,0,0.20)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110">
                      {c.icon}
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-ink">{c.title}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                      {c.items.map((it) => (
                        <li key={it} className="flex gap-2.5">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brand/60" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* 단체 BBQ 배너 */}
            <Reveal delay={120} from={{ y: 40 }} duration={0.8} className="mt-4 block">
              <div className="flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-[#23322d] p-8 text-white sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-bold">단체 BBQ · 최대 200명</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    워크숍·동호회·가족 행사는 사전 예약·문의로 진행됩니다.
                  </p>
                </div>
                <a
                  href="tel:01030452994"
                  className="inline-flex flex-none items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M6.5 3h3l1.5 5-2 1.5a11 11 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  010-3045-2994
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
