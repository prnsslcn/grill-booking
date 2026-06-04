import { FacilityEditor } from '@/components/admin/FacilityEditor';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FacilityType } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function AdminFacilitiesPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('facilities')
    .select('type, name, price, is_active, total_units')
    .order('price', { ascending: true });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">가격·판매 관리</h1>
      <p className="mt-1 text-sm text-muted">가격은 원 단위 정수. 판매중을 끄면 신규 예약이 막힙니다.</p>

      <Card className="mt-5 divide-y divide-line px-5">
        {(data ?? []).map((f) => (
          <FacilityEditor
            key={f.type}
            type={f.type as FacilityType}
            name={`${f.name} (${f.total_units}동)`}
            price={f.price}
            isActive={f.is_active}
          />
        ))}
      </Card>
    </div>
  );
}
