import { AddonEditor } from '@/components/admin/AddonEditor';
import { FacilityEditor } from '@/components/admin/FacilityEditor';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function AdminFacilitiesPage() {
  const supabase = createAdminClient();
  const [{ data: facilities }, { data: addons }] = await Promise.all([
    supabase
      .from('facilities')
      .select('type, name, capacity, price_pork, price_beef, is_active, total_units')
      .order('capacity', { ascending: true }),
    supabase
      .from('addons')
      .select('key, label, price, is_active')
      .order('sort', { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">시설 세트 가격·판매</h1>
        <p className="mt-1 text-sm text-muted">
          고기 종류별 세트 가격(원 단위 정수). 판매중을 끄면 신규 예약이 막힙니다.
        </p>
        <Card className="mt-4 divide-y divide-line px-5">
          {(facilities ?? []).map((f) => (
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

      <div>
        <h2 className="text-xl font-bold text-ink">추가 메뉴 가격·판매</h2>
        <p className="mt-1 text-sm text-muted">
          예약 시 선택하는 추가 고기 단가. 판매중을 끄면 추가 메뉴에서 숨겨집니다.
        </p>
        <Card className="mt-4 divide-y divide-line px-5">
          {(addons ?? []).map((a) => (
            <AddonEditor
              key={a.key}
              addonKey={a.key}
              label={a.label}
              price={a.price}
              isActive={a.is_active}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}
