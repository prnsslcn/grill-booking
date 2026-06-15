import type { Metadata } from 'next';

import { Reveal } from '@/components/ui/Reveal';
import { FacilityGallery } from '@/components/site/FacilityGallery';
import { MissionBricks } from '@/components/site/MissionBricks';
import { SiteFooter } from '@/components/site/SiteFooter';
import { TempHeader } from '@/components/site/TempHeader';
import { getAddons } from '@/lib/booking/availability';
import { meatGrams } from '@/lib/facilities';
import { formatWon } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

// 임시 랜딩(온라인 예약 준비 중 — 유선 예약 유도). 정상 오픈 시 app/home/page.tsx 내용을 이 파일로 되돌린다.
export const revalidate = 60;

export const metadata: Metadata = {
  title: '알펜시아 BBQ — 대관령 프리미엄 BBQ',
  description:
    '대관령 알펜시아 BBQ. 타프 텐트·카바나·야외 테이블에서 즐기는 고기세트 포함 프리미엄 BBQ. 금·토 2부제 운영. 예약 문의 010-3045-2994.',
};

const PHONE = '010-3045-2994';
const TEL = 'tel:01030452994';
// 홈 중앙 grill.png 대체 — 시설 실사 4장 (타프 t1·t2 / 카바나 c1·c2).
const GALLERY = ['/images/t1.jpg', '/images/t2.jpg', '/images/c1.jpg', '/images/c2.jpg'];

const FACILITY_DESC: Record<string, string> = {
  tarp_tent: '오픈형 타프 텐트에서 즐기는 숯불 바비큐',
  cabin: '프라이빗 카바나에서 아늑하게',
  outdoor_table: '간편하게 즐기는 야외 테이블 (4인)',
};
const FACILITY_STYLE: Record<string, { card: string; muted: string }> = {
  outdoor_table: { card: 'bg-brand-soft text-ink', muted: 'text-muted' },
  tarp_tent: { card: 'bg-[#23322d] text-white', muted: 'text-white/65' },
  cabin: { card: 'bg-brand text-white', muted: 'text-white/75' },
};
const FACILITY_STYLE_DEFAULT = { card: 'bg-brand-soft text-ink', muted: 'text-muted' };
const FACILITY_FROM = [{ x: 760 }, { x: 760 }, { x: 760 }];

async function getFacilities() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, capacity, price_pork, price_beef, total_units')
    .eq('is_active', true)
    .order('capacity', { ascending: true });
  return data ?? [];
}

export default async function TempLanding() {
  // 임시 랜딩에선 야외 테이블 숨김
  const facilities = (await getFacilities()).filter((f) => f.type !== 'outdoor_table');
  const addons = await getAddons(); // 고기 추가 옵션(booking 단계와 동일)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      {/* 헤더 — 워드마크 슬라이드인 + 전화 예약 (예약 시스템 링크 없음) */}
      <TempHeader />

      <main className="flex-1">
        {/* 히어로 — 워드마크 + 서브 + 공지 */}
        <section className="bg-surface">
          <div className="mx-auto max-w-5xl px-5 pb-10 pt-14 text-center sm:pt-20">
            <h1
              data-hero-wordmark
              className="whitespace-nowrap font-display text-5xl tracking-wide text-wood sm:text-8xl"
            >
              Alpensia BBQ
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted">
              대관령의 아름다운 자연 속에서 가족, 친구, 연인과 함께 프리미엄 BBQ를 즐겨보세요.
            </p>

            {/* 공지 — 유선 예약 유도 */}
            <Reveal from={{ y: 24 }} className="mt-8 block">
              <div className="mx-auto max-w-2xl rounded-3xl border border-brand/30 bg-brand-soft px-6 py-6">
                <p className="text-base font-bold text-brand-strong sm:text-lg">
                  온라인 예약 시스템은 준비 중입니다
                </p>
                <p className="mt-2 leading-relaxed text-ink">
                  당분간{' '}
                  <a href={TEL} className="font-bold underline-offset-2 hover:underline">
                    {PHONE}
                  </a>
                  로 유선 예약 부탁드립니다.
                </p>
                <p className="mt-1 text-sm text-muted">상담 시간 11:00~19:00</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 시설 사진 카루셀 — 홈 중앙 grill.png 대체 (실사 4장) */}
        <FacilityGallery name="알펜시아 BBQ 시설" headline={false} images={GALLERY} />

        {/* 시설 안내 — 정보 카드(예약 링크 없음) */}
        <section className="overflow-hidden bg-surface py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">시설 안내</h2>
            <p className="mt-2 text-muted">모든 상품에 고기세트가 포함됩니다 (정원 기준 1인 150g).</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
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
                    <div
                      className={`flex h-full min-h-[240px] flex-col justify-between rounded-3xl p-7 ${s.card}`}
                    >
                      <div>
                        <h3 className="text-2xl font-bold leading-tight">{f.name}</h3>
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

                        {addons.length > 0 && (
                          <div className="mt-3 border-t border-white/15 pt-3">
                            <p className={`text-xs font-semibold ${s.muted}`}>고기 추가 옵션 (선택)</p>
                            <div className="mt-2 space-y-1">
                              {addons.map((a) => (
                                <div
                                  key={a.key}
                                  className="flex items-baseline justify-between text-xs"
                                >
                                  <span className={s.muted}>{a.label}</span>
                                  <span className="font-semibold">+{formatWon(a.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 이용 안내 — 브릭 레이아웃 */}
        <section className="overflow-hidden bg-surface py-12 sm:py-16">
          <MissionBricks />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
