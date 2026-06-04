import { CloseDateButton } from '@/components/admin/CloseDateButton';
import { GenerateSlotsForm } from '@/components/admin/GenerateSlotsForm';
import { SlotToggle } from '@/components/admin/SlotToggle';
import { Card } from '@/components/ui/Card';
import { listSlotsByDate } from '@/lib/admin/slots';
import { formatDateKorean } from '@/lib/format';
import { PARTS, type Part } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function AdminSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date = '' } = await searchParams;
  const slots = date ? await listSlotsByDate(date) : [];

  // 시설명 → 동 → 부 그리드
  const byFacility = new Map<string, Map<string, Record<number, (typeof slots)[number]>>>();
  for (const s of slots) {
    if (!byFacility.has(s.facilityName)) byFacility.set(s.facilityName, new Map());
    const units = byFacility.get(s.facilityName)!;
    if (!units.has(s.unitLabel)) units.set(s.unitLabel, {});
    units.get(s.unitLabel)![s.part] = s;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">슬롯 생성</h1>
        <p className="mt-1 text-sm text-muted">기간 내 금·토에 대해 모든 동×2부 슬롯을 생성합니다(중복은 건너뜀).</p>
        <div className="mt-4">
          <GenerateSlotsForm />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">슬롯 열기/닫기</h2>
          {date && slots.length > 0 && <CloseDateButton date={date} />}
        </div>
        <form className="mt-4 flex items-end gap-3" method="get">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">날짜 선택</span>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent"
            />
          </label>
          <button className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white">
            조회
          </button>
        </form>

        {date && (
          <div className="mt-5 space-y-4">
            {[...byFacility.entries()].map(([facilityName, units]) => (
              <Card key={facilityName} className="p-5">
                <h3 className="font-bold text-ink">
                  {facilityName} <span className="text-sm font-normal text-subtle">· {formatDateKorean(date)}</span>
                </h3>
                <div className="mt-3 space-y-2">
                  {[...units.entries()].map(([unitLabel, parts]) => (
                    <div key={unitLabel} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-muted">{unitLabel}</span>
                      <div className="flex gap-2">
                        {([1, 2] as Part[]).map((p) => {
                          const slot = parts[p];
                          if (!slot) return <span key={p} className="text-xs text-subtle">{PARTS[p].label} 없음</span>;
                          return (
                            <div key={p} className="flex items-center gap-1.5">
                              <span className="text-xs text-subtle">{PARTS[p].label}</span>
                              <SlotToggle slotId={slot.slotId} status={slot.status} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {slots.length === 0 && (
              <p className="py-8 text-center text-sm text-subtle">
                해당 날짜에 슬롯이 없습니다. 위에서 생성하세요.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
