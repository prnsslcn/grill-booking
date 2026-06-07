'use client';

import { useState } from 'react';

import { Calendar } from '@/components/booking/Calendar';
import { PaymentStep } from '@/components/booking/PaymentStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatPhone, formatWon } from '@/lib/format';
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

const STEPS = ['시설·시간', '정보 입력', '결제'];
const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const MEAT_LABEL: Record<Meat, string> = { pork: '돼지', beef: '소' };

export default function BookingPage() {
  const [step, setStep] = useState(1);

  const [date, setDate] = useState<string>('');
  const [avail, setAvail] = useState<FacilityAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [meat, setMeat] = useState<Meat | ''>('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amount = selected && meat ? (meat === 'pork' ? selected.pricePork : selected.priceBeef) : 0;

  async function selectDate(iso: string) {
    setDate(iso);
    setSelected(null);
    setLoadingAvail(true);
    try {
      const res = await fetch(`/api/availability?date=${iso}`);
      const body = (await res.json()) as { availability: FacilityAvailability[] };
      setAvail(body.availability ?? []);
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
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <div className="mb-8">
          <Stepper current={step} labels={STEPS} />
        </div>

        {/* 1단계: 날짜·시설·시간·고기 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-ink">날짜 선택</h2>
              <p className="mt-1 text-sm text-muted">금·토만 운영합니다. 월 이동으로 원하는 날짜를 고르세요.</p>
              <div className="mt-3">
                <Calendar
                  value={date}
                  onSelect={selectDate}
                  allowedDows={[5, 6]}
                  disablePast
                  hint="금·토만 예약 가능합니다."
                />
              </div>
            </div>

            {date && (
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
                            돼지 {formatWon(f.pricePork)} · 소 {formatWon(f.priceBeef)}
                          </span>
                        </div>
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
            )}

            {/* 고기 선택 */}
            {selected && (
              <div>
                <h2 className="text-lg font-bold text-ink">고기 선택</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['pork', 'beef'] as Meat[]).map((m) => {
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
                        <span className="block font-semibold text-ink">{MEAT_LABEL[m]} 세트</span>
                        <span className="mt-1 block text-sm text-muted">{formatWon(price)}</span>
                      </button>
                    );
                  })}
                </div>
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
              {selected.facilityName} · {selected.capacity}인 · {meat && MEAT_LABEL[meat]} 세트 · {formatWon(amount)}
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
    </div>
  );
}
