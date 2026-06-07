import { FacilityEditor } from '@/components/admin/FacilityEditor';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function AdminFacilitiesPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, capacity, price_pork, price_beef, is_active, total_units')
    .order('capacity', { ascending: true });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">가격·판매 관리</h1>
      <p className="mt-1 text-sm text-muted">
        고기 종류별 세트 가격(원 단위 정수). 판매중을 끄면 신규 예약이 막힙니다.
      </p>

      <Card className="mt-5 divide-y divide-line px-5">
        {(data ?? []).map((f) => (
          <FacilityEditor
            key={f.type}
            type={f.type as FacilityType}
            name={`${f.name} (${f.capacity}인 · ${f.total_units}동)`}
            pricePork={f.price_pork}
            priceBeef={f.price_beef}
            isActive={f.is_active}
          />
        ))}
      </Card>
    </div>
  );
}
