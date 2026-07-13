'use client';

import { useEffect, useState } from 'react';

import { Calendar } from '@/components/booking/Calendar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { formatWon } from '@/lib/format';
import { bookingMaxDate, firstBookableDate } from '@/lib/policy/booking-window';
import { PARTS, type Part } from '@/types/domain';

interface PartAvail {
  part: Part;
  available: boolean;
  slotId: string | null;
}
interface FacilityAvail {
  type: string;
  name: string;
  capacity: number;
  pricePork: number;
  parts: PartAvail[];
}
interface Addon {
  key: string;
  label: string;
  price: number;
}
interface Selected {
  slotId: string;
  facilityName: string;
  capacity: number;
  part: Part;
  pricePork: number;
}

/**
 * 고객 예약 변경 폼(Stage 1). 새 날짜·시설·부·인원·추가메뉴를 골라 /api/bookings/change로 제출.
 * 동일가/다운그레이드(차액 자동환불)는 즉시 처리, 업그레이드(추가결제)는 안내.
 */
export function ChangeBookingForm({
  bookingNumber,
  phone,
  currentAmount,
  onChanged,
  onClose,
}: {
  bookingNumber: string;
  phone: string;
  currentAmount: number;
  onChanged: (msg: string) => void;
  onClose: () => void;
}) {
  const maxBookable = bookingMaxDate();
  const minBookable = firstBookableDate();

  const [openDates, setOpenDates] = useState<string[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [facilities, setFacilities] = useState<FacilityAvail[]>([]);
  const [addonsCatalog, setAddonsCatalog] = useState<Addon[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Selected | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/open-dates')
      .then((r) => r.json())
      .then((b: { dates?: string[]; closedDates?: string[] }) => {
        setOpenDates(b.dates ?? []);
        setClosedDates(b.closedDates ?? []);
      })
      .catch(() => {});
  }, []);

  async function onSelectDate(iso: string) {
    setDate(iso);
    setSelected(null);
    setErr('');
    setLoadingAvail(true);
    try {
      const res = await fetch(`/api/availability?date=${iso}`);
      const body = (await res.json()) as { availability?: FacilityAvail[]; addons?: Addon[] };
      setFacilities(body.availability ?? []);
      setAddonsCatalog(body.addons ?? []);
    } finally {
      setLoadingAvail(false);
    }
  }

  const addonTotal = addonsCatalog.reduce((s, a) => s + a.price * (addonQty[a.key] ?? 0), 0);
  const expectedAmount = selected ? selected.pricePork + addonTotal : 0;
  const delta = expectedAmount - currentAmount;

  async function submit() {
    if (!selected) return;
    setErr('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNumber,
          phone,
          newSlotId: selected.slotId,
          guestCount,
          meat: 'pork',
          addons: Object.fromEntries(Object.entries(addonQty).filter(([, q]) => q > 0)),
          expectedAmount,
        }),
      });
      const body = (await res.json()) as { error?: string; delta?: number; refunded?: number };
      if (!res.ok) {
        setErr(errorMessage(body.error));
        return;
      }
      const msg =
        (body.refunded ?? 0) > 0
          ? `예약이 변경되었습니다. 차액 ${formatWon(body.refunded ?? 0)}이 환불됩니다(결제수단에 따라 수일 소요).`
          : '예약이 변경되었습니다.';
      onChanged(msg);
    } catch {
      setErr('변경 처리 중 문제가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-line p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">예약 변경</p>
        <button onClick={onClose} className="text-sm text-muted hover:text-ink">
          닫기
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        새 날짜·시설·시간·인원·추가메뉴를 선택하세요. 이용 2일 전까지 변경할 수 있습니다.
      </p>

      <div className="mt-4">
        <Calendar
          value={date}
          onSelect={onSelectDate}
          allowedDows={[5, 6]}
          allowedDates={openDates}
          closedDates={closedDates}
          disablePast
          minDate={minBookable}
          maxDate={maxBookable}
          hint={`금·토${openDates.length > 0 ? ' 및 지정 오픈일' : ''} · ${maxBookable}까지`}
        />
      </div>

      {date && (
        <div className="mt-4 space-y-2">
          {loadingAvail && <p className="text-sm text-subtle">불러오는 중…</p>}
          {!loadingAvail &&
            facilities.map((f) => (
              <Card key={f.type} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">
                    {f.name} <span className="text-xs font-normal text-muted">· {f.capacity}인</span>
                  </span>
                  <span className="text-sm text-muted">돼지 {formatWon(f.pricePork)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {f.parts.map((p) => {
                    const isSel = selected?.slotId === p.slotId && p.slotId !== null;
                    return (
                      <button
                        key={p.part}
                        type="button"
                        disabled={!p.available || !p.slotId}
                        onClick={() => {
                          if (!p.slotId) return;
                          setSelected({
                            slotId: p.slotId,
                            facilityName: f.name,
                            capacity: f.capacity,
                            part: p.part,
                            pricePork: f.pricePork,
                          });
                          setGuestCount(f.capacity);
                        }}
                        className={`rounded-lg border p-2.5 text-sm transition-colors ${
                          isSel
                            ? 'border-accent bg-accent-soft font-semibold text-accent-strong'
                            : p.available
                              ? 'border-line hover:border-accent/40'
                              : 'cursor-not-allowed border-line bg-line-soft/40 text-subtle'
                        }`}
                      >
                        {PARTS[p.part].label} {PARTS[p.part].start}~{PARTS[p.part].end}
                        {!p.available && <span className="ml-1 text-xs">· 마감</span>}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
        </div>
      )}

      {selected && (
        <div className="mt-4 space-y-4">
          <Field label="인원">
            <Input
              type="number"
              min={1}
              value={String(guestCount)}
              onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
            />
          </Field>

          {addonsCatalog.length > 0 && (
            <div>
              <span className="mb-1 block text-sm font-medium text-ink">고기 추가 (선택)</span>
              <div className="space-y-1.5">
                {addonsCatalog.map((a) => {
                  const qty = addonQty[a.key] ?? 0;
                  const set = (n: number) =>
                    setAddonQty((prev) => ({ ...prev, [a.key]: Math.max(0, n) }));
                  return (
                    <div key={a.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-ink">
                        {a.label} <span className="text-xs text-subtle">+{formatWon(a.price)}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => set(qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                        >
                          −
                        </button>
                        <span className="w-8 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => set(qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Card className="space-y-1 p-4 text-sm">
            <Row label="기존 결제금액" value={formatWon(currentAmount)} />
            <Row label="변경 후 금액" value={formatWon(expectedAmount)} strong />
            <Row
              label="차액"
              value={
                delta === 0
                  ? '없음 (동일 금액)'
                  : delta < 0
                    ? `${formatWon(-delta)} 환불`
                    : `${formatWon(delta)} 추가 결제 필요`
              }
            />
          </Card>

          {delta > 0 && (
            <p className="text-sm text-danger">
              추가 결제가 필요한 변경입니다. 현재는 취소 후 재예약 또는 전화(010-3045-2994)로 문의해
              주세요.
            </p>
          )}
          {err && <p className="text-sm text-danger">{err}</p>}

          <Button size="lg" onClick={submit} disabled={submitting || delta > 0}>
            {submitting ? '변경 처리 중…' : '이 내용으로 변경'}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={strong ? 'font-bold text-ink' : 'font-medium text-ink'}>{value}</span>
    </div>
  );
}

function errorMessage(code?: string): string {
  switch (code) {
    case 'CHANGE_WINDOW_CLOSED':
      return '이용 2일 전까지만 변경할 수 있습니다.';
    case 'SLOT_TAKEN':
    case 'SLOT_CLOSED':
      return '선택하신 시간이 방금 마감되었습니다. 다른 시간을 선택해 주세요.';
    case 'UPGRADE_REQUIRES_PAYMENT':
      return '추가 결제가 필요한 변경입니다. 취소 후 재예약해 주세요.';
    case 'AMOUNT_CHANGED':
      return '가격 정보가 갱신되었습니다. 다시 시도해 주세요.';
    case 'NOT_CHANGEABLE':
      return '변경할 수 없는 예약 상태입니다.';
    case 'BOOKING_NOT_FOUND':
      return '예약을 찾을 수 없습니다.';
    default:
      return '변경 처리 중 문제가 발생했습니다.';
  }
}
