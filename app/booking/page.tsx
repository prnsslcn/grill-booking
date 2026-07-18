'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Calendar } from '@/components/booking/Calendar';
import { DropletReveal } from '@/components/site/DropletReveal';
import { PaymentStep } from '@/components/booking/PaymentStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { BEEF_ENABLED } from '@/lib/config';
import { meatGrams } from '@/lib/facilities';
import { formatPhone, formatWon } from '@/lib/format';
import {
  bookingMaxDate,
  firstBookableDate,
  SAME_DAY_CUTOFF_HOUR,
} from '@/lib/policy/booking-window';

const CUTOFF_LABEL = `${String(SAME_DAY_CUTOFF_HOUR).padStart(2, '0')}:00`;
import { PARTS, type Part } from '@/types/domain';

type Meat = 'pork' | 'beef';

interface PartAvailability {
  part: Part;
  available: boolean;
  slotId: string | null;
}
interface FacilityAvailability {
  type: string;
  name: string;
  capacity: number;
  pricePork: number;
  priceBeef: number;
  weatherDependent: boolean;
  parts: PartAvailability[];
}
interface Selected {
  slotId: string;
  facilityName: string;
  capacity: number;
  part: Part;
  pricePork: number;
  priceBeef: number;
}
interface Addon {
  key: string;
  label: string;
  price: number;
}

const STEPS = ['시설·시간', '정보 입력', '결제'];
const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const MEAT_LABEL: Record<Meat, string> = { pork: 'Pork', beef: 'Beef' };

function BookingFlow() {
  const searchParams = useSearchParams();
  const preferredType = searchParams.get('facility');

  // 예약 가능한 마지막 날짜(오늘 + 1개월 − 1일). 달력 상한·안내에 사용.
  const maxBookable = bookingMaxDate();
  // 선택 가능한 가장 이른 날짜. 당일 마감 시각 지나면 내일부터. 달력 하한.
  const minBookable = firstBookableDate();

  const [step, setStep] = useState(1);

  // 단계(1→2→3) 전환 시 항상 최상단에서 시작 (페이지 이동과 동일한 UX)
  useEffect(() => {
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [step]);

  const [date, setDate] = useState<string>('');
  const [avail, setAvail] = useState<FacilityAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  // 관리자 지정 오픈일(금·토 외 운영일) — 달력에서 선택 가능하게.
  const [openDates, setOpenDates] = useState<string[]>([]);
  // 관리자 휴무일(금·토라도 닫힘) — 달력에서 선택 불가하게.
  const [closedDates, setClosedDates] = useState<string[]>([]);

  // 운영일 정보 로드(달력 선택 가능/불가 날짜)
  useEffect(() => {
    fetch('/api/open-dates')
      .then((r) => r.json())
      .then((b: { dates?: string[]; closedDates?: string[] }) => {
        setOpenDates(b.dates ?? []);
        setClosedDates(b.closedDates ?? []);
      })
      .catch(() => {});
  }, []);
  const [meat, setMeat] = useState<Meat | ''>('');
  const [addonsCatalog, setAddonsCatalog] = useState<Addon[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setPrice = selected && meat ? (meat === 'pork' ? selected.pricePork : selected.priceBeef) : 0;
  const addonTotal = addonsCatalog.reduce((sum, a) => sum + a.price * (addonQty[a.key] ?? 0), 0);
  const amount = setPrice + addonTotal;
  const addonLines = addonsCatalog
    .filter((a) => (addonQty[a.key] ?? 0) > 0)
    .map((a) => ({ label: a.label, price: a.price, qty: addonQty[a.key] }));

  function setQty(key: string, delta: number) {
    setAddonQty((q) => {
      const next = Math.max(0, (q[key] ?? 0) + delta);
      return { ...q, [key]: next };
    });
  }

  async function selectDate(iso: string) {
    setDate(iso);
    setSelected(null);
    setLoadingAvail(true);
    try {
      const res = await fetch(`/api/availability?date=${iso}`);
      const body = (await res.json()) as { availability: FacilityAvailability[]; addons: Addon[] };
      const list = body.availability ?? [];
      setAvail(list);
      setAddonsCatalog(body.addons ?? []);

      // 시설 상세에서 넘어온 경우(?facility=type): 해당 시설의 첫 가능한 시간대를 자동 선택.
      if (preferredType) {
        const fac = list.find((f) => f.type === preferredType);
        const part = fac?.parts.find((p) => p.available && p.slotId);
        if (fac && part?.slotId) {
          setSelected({
            slotId: part.slotId,
            facilityName: fac.name,
            capacity: fac.capacity,
            part: part.part,
            pricePork: fac.pricePork,
            priceBeef: fac.priceBeef,
          });
        }
      }
    } finally {
      setLoadingAvail(false);
    }
  }

  function validateInfo(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '이름을 입력하세요.';
    if (!PHONE_RE.test(phone.trim())) e.phone = '휴대폰 번호 형식이 올바르지 않습니다.';
    if (!agree) e.agree = '환불 규정에 동의해 주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <div className="mb-8">
          <Stepper current={step} labels={STEPS} />
        </div>

        {/* 1단계: 날짜·시설·시간·고기 */}
        {step === 1 && (
          <div className="space-y-6">
            <DropletReveal>
            <div>
              <h2 className="text-lg font-bold text-ink">날짜 선택</h2>
              <p className="mt-1 text-sm text-muted">
                금·토{openDates.length > 0 ? ' 및 지정 오픈일' : ''}에 운영합니다. 예약은 오늘부터
                1개월 이내({maxBookable}까지) 날짜만 가능하며, 당일 예약은 {CUTOFF_LABEL}까지입니다.
              </p>
              <div className="mt-3">
                <Calendar
                  value={date}
                  onSelect={selectDate}
                  allowedDows={[5, 6]}
                  allowedDates={openDates}
                  closedDates={closedDates}
                  disablePast
                  minDate={minBookable}
                  maxDate={maxBookable}
                  hint={`금·토${openDates.length > 0 ? ' 및 지정 오픈일' : ''} · ${maxBookable}까지 · 당일은 ${CUTOFF_LABEL}까지`}
                />
              </div>
            </div>
            </DropletReveal>

            {date && (
              <DropletReveal>
              <div>
                <h2 className="text-lg font-bold text-ink">시설·시간 선택</h2>
                <p className="mt-1 text-sm text-muted">인원에 맞는 시설이 배정됩니다(동 지정 불가).</p>
                {loadingAvail ? (
                  <p className="mt-3 text-sm text-subtle">불러오는 중…</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {avail.map((f) => (
                      <Card key={f.type} className="p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">
                            {f.name} <span className="text-sm font-normal text-subtle">· {f.capacity}인</span>
                          </span>
                          <span className="text-xs text-subtle">
                            돼지 {formatWon(f.pricePork)}
                            {BEEF_ENABLED && ` · 소 ${formatWon(f.priceBeef)}`}
                          </span>
                        </div>
                        {f.weatherDependent && (
                          <p className="mt-1.5 text-xs text-[#c2780f]">
                            ☔ 우천 시 운영이 제한될 수 있습니다.
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {f.parts.map((p) => {
                            const info = PARTS[p.part];
                            const isSel = selected?.slotId === p.slotId && p.slotId !== null;
                            return (
                              <button
                                key={p.part}
                                disabled={!p.available}
                                onClick={() =>
                                  p.slotId &&
                                  setSelected({
                                    slotId: p.slotId,
                                    facilityName: f.name,
                                    capacity: f.capacity,
                                    part: p.part,
                                    pricePork: f.pricePork,
                                    priceBeef: f.priceBeef,
                                  })
                                }
                                className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                  !p.available
                                    ? 'cursor-not-allowed border-line-soft bg-line-soft text-subtle'
                                    : isSel
                                      ? 'border-accent bg-accent-soft text-accent'
                                      : 'border-line bg-surface text-ink hover:border-accent/40'
                                }`}
                              >
                                <span className="font-semibold">{info.label}</span>{' '}
                                <span className="text-xs">
                                  {info.start}~{info.end}
                                </span>
                                {!p.available && <span className="ml-1 text-xs">· 마감</span>}
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              </DropletReveal>
            )}

            {/* 고기 선택 */}
            {selected && (
              <DropletReveal>
              <div>
                <h2 className="text-lg font-bold text-ink">고기 선택</h2>
                <div className={`mt-3 grid gap-2 ${BEEF_ENABLED ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {(BEEF_ENABLED ? (['pork', 'beef'] as Meat[]) : (['pork'] as Meat[])).map((m) => {
                    const price = m === 'pork' ? selected.pricePork : selected.priceBeef;
                    return (
                      <button
                        key={m}
                        onClick={() => setMeat(m)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          meat === m
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-surface hover:border-accent/40'
                        }`}
                      >
                        <span className="block font-semibold text-ink">{MEAT_LABEL[m]} Set</span>
                        <span className="mt-1 block text-sm text-muted">
                          {formatWon(price)} · {meatGrams(selected.capacity)}g
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </DropletReveal>
            )}

            {/* 추가메뉴 (선택) */}
            {selected && meat && addonsCatalog.length > 0 && (
              <DropletReveal>
              <div>
                <h2 className="text-lg font-bold text-ink">추가 메뉴 <span className="text-sm font-normal text-subtle">(선택)</span></h2>
                <div className="mt-3 space-y-2">
                  {addonsCatalog.map((a) => {
                    const qty = addonQty[a.key] ?? 0;
                    return (
                      <Card key={a.key} className="flex items-center justify-between p-4">
                        <div>
                          <span className="block text-sm font-medium text-ink">{a.label}</span>
                          <span className="text-sm text-muted">{formatWon(a.price)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQty(a.key, -1)}
                            disabled={qty === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-ink">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(a.key, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                          >
                            +
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
              </DropletReveal>
            )}

            {selected && meat && (
              <div className="flex items-center justify-between rounded-xl bg-line-soft px-4 py-3">
                <span className="text-sm text-muted">합계</span>
                <span className="text-lg font-extrabold text-ink">{formatWon(amount)}</span>
              </div>
            )}

            <Button size="lg" disabled={!selected || !meat} onClick={() => setStep(2)}>
              다음
            </Button>
          </div>
        )}

        {/* 2단계: 정보 입력 */}
        {step === 2 && selected && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-ink">예약자 정보</h2>
            <Card className="bg-line-soft/50 p-4 text-sm text-muted">
              {selected.facilityName} · {selected.capacity}인 · {meat && MEAT_LABEL[meat]} Set · {formatWon(amount)}
            </Card>
            <Field label="이름" error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </Field>
            <Field label="휴대폰 번호" error={errors.phone} hint="예약 조회·알림에 사용됩니다.">
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                inputMode="numeric"
                maxLength={13}
              />
            </Field>

            <label className="flex items-start gap-2.5 rounded-xl bg-line-soft p-4">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="text-sm text-muted">
                환불 규정(2일 전 100% · 1일 전 50% · 당일 0%)을 확인했으며 이에 동의합니다.
              </span>
            </label>
            {errors.agree && <p className="-mt-2 text-sm text-danger">{errors.agree}</p>}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                이전
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (validateInfo()) setStep(3);
                }}
              >
                다음
              </Button>
            </div>
          </div>
        )}

        {/* 3단계: 결제 */}
        {step === 3 && selected && meat && (
          <div className="space-y-4">
            <PaymentStep
              selected={{
                slotId: selected.slotId,
                facilityName: selected.facilityName,
                part: selected.part,
                capacity: selected.capacity,
                amount,
                meat,
                meatLabel: MEAT_LABEL[meat],
                addons: addonQty,
                addonLines,
              }}
              date={date}
              guest={{ name: name.trim(), phone: phone.trim() }}
              onSlotTaken={() => {
                setStep(1);
                if (date) void selectDate(date);
              }}
            />
            <Button variant="ghost" onClick={() => setStep(2)} className="w-full">
              이전
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] flex-col"><SiteHeader /></div>}>
      <BookingFlow />
    </Suspense>
  );
}
