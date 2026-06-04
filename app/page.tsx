import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatWon } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

// DB(가격)를 요청 시 읽는다 — 빌드 시점 DB 접속·가격 고착을 피한다.
export const dynamic = 'force-dynamic';

const FACILITY_DESC: Record<FacilityType, string> = {
  tarp_tent: '오픈형 타프 텐트에서 즐기는 숯불 바비큐',
  cabin: '프라이빗 캐빈 하우스에서 아늑하게',
  trailer: '이색 트레일러에서 보내는 특별한 저녁',
};

async function getFacilities() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, price, total_units')
    .eq('is_active', true)
    .order('price', { ascending: true });
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
              타프 텐트·캐빈 하우스·트레일러를 고기세트와 함께 예약하세요. 금·토 2부제로 운영합니다.
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
                    {FACILITY_DESC[f.type as FacilityType]}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="text-xl font-extrabold text-ink">{formatWon(f.price)}</span>
                    <span className="text-xs text-subtle">{f.total_units}동 운영</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 안내 */}
        <section className="py-16">
          <div className="mx-auto grid max-w-5xl gap-4 px-5 sm:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-bold text-ink">운영 안내</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>· 운영일: 매주 금요일·토요일</li>
                <li>· 1부 17:00 ~ 19:00 / 2부 19:30 ~ 21:30</li>
                <li>· 예약 시 100% 선결제로 확정됩니다.</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-ink">환불 규정</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                <li>· 이용 2일 전까지: 100% 환불</li>
                <li>· 이용 1일 전: 50% 환불</li>
                <li>· 이용 당일·노쇼: 환불 불가</li>
              </ul>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
