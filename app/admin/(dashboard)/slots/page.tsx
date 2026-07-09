import { CloseDateButton } from '@/components/admin/CloseDateButton';
import { ReopenDateButton } from '@/components/admin/ReopenDateButton';
import { GenerateSlotsForm } from '@/components/admin/GenerateSlotsForm';
import { OpenDatesCalendar } from '@/components/admin/OpenDatesCalendar';
import { SlotToggle } from '@/components/admin/SlotToggle';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { listClosedDates, listOpenDates } from '@/lib/admin/open-dates';
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
  const [slots, openDates, closedDates] = await Promise.all([
    date ? listSlotsByDate(date) : Promise.resolve([]),
    listOpenDates(),
    listClosedDates(),
  ]);

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
        <h1 className="text-xl font-bold text-ink">운영일 관리</h1>
        <p className="mt-1 text-sm text-muted">
          평소엔 <strong>금·토만</strong> 운영합니다. 캘린더에서 <strong>평일을 클릭</strong>하면 성수기 등 특정일을
          추가로 열고, <strong>금·토를 클릭</strong>하면 휴무 처리합니다. 변경 즉시 반영되며, 예약 가능 기간(오늘부터
          1개월) 이내면 고객 달력에 적용됩니다. 휴무 처리해도 <strong>이미 확정된 예약은 유지</strong>되므로, 취소가
          필요하면 예약 관리에서 별도로 처리하세요.
        </p>
        <div className="mt-4">
          <OpenDatesCalendar
            openDates={openDates.map((o) => o.date)}
            closedDates={closedDates.map((o) => o.date)}
          />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-ink">슬롯 미리 생성</h1>
        <p className="mt-1 text-sm text-muted">
          평소엔 고객이 날짜를 조회하면 슬롯이 자동 생성되므로 생성은 필수가 아닙니다.
          특정 날짜의 동을 <strong>미리 닫거나 휴무 처리</strong>하려면, 먼저 이 기능으로 해당 기간을 생성한 뒤 아래에서 관리하세요.
        </p>
        <div className="mt-4">
          <GenerateSlotsForm />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">슬롯 열기/닫기</h2>
          {date && slots.length > 0 && (
            <div className="flex items-center gap-2">
              <ReopenDateButton date={date} />
              <CloseDateButton date={date} />
            </div>
          )}
        </div>
        <form className="mt-4 flex items-end gap-3" method="get">
          <div className="text-sm">
            <span className="mb-1 block font-medium text-ink">날짜 선택</span>
            <DatePicker name="date" defaultValue={date} />
          </div>
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
