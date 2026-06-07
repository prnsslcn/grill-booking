import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
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
      <SiteHeader />

      <main className="flex-1">
        {/* 히어로 */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
            <Badge tone="accent">고기세트 포함 · 전액 선결제</Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              숯불 그릴과 함께하는
              <br />
              하룻저녁의 쉼
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              인원에 맞는 야외 테이블·타프·카바나에서 돼지/소 BBQ 세트를 즐기세요. 금·토 2부제 사전 예약.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/booking">
                <Button size="md" className="px-6">
                  예약하기
                </Button>
              </Link>
              <Link href="/booking/lookup">
                <Button variant="secondary" size="md" className="px-6">
                  예약조회
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 시설 */}
        <section className="bg-surface py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-bold text-ink">시설 안내</h2>
            <p className="mt-2 text-muted">모든 상품에 고기세트가 포함됩니다.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {facilities.map((f) => (
                <Card key={f.type} className="flex flex-col p-6">
                  <h3 className="text-lg font-bold text-ink">{f.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {FACILITY_DESC[f.type]}
                  </p>
                  <div className="mt-5 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">돼지 세트</span>
                      <span className="font-bold text-ink">{formatWon(f.price_pork)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">소 세트</span>
                      <span className="font-bold text-ink">{formatWon(f.price_beef)}</span>
                    </div>
                    <p className="pt-1 text-xs text-subtle">
                      기준 {f.capacity}인 · {f.total_units}동 운영
                    </p>
                  </div>
                </Card>
              ))}
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
