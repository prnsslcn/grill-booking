'use client';

import { useState } from 'react';

import { PaymentStep } from '@/components/booking/PaymentStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { SiteHeader } from '@/components/site/SiteHeader';
import { upcomingOperatingDates } from '@/lib/dates';
import { formatDateKorean, formatWon } from '@/lib/format';
import { PARTS, type Part } from '@/types/domain';

interface PartAvailability {
  part: Part;
  available: boolean;
  slotId: string | null;
}
interface FacilityAvailability {
  type: string;
  name: string;
  price: number;
  parts: PartAvailability[];
}
interface Selected {
  slotId: string;
  facilityName: string;
  price: number;
  part: Part;
}

const DATES = upcomingOperatingDates(8);
const STEPS = ['슬롯 선택', '정보 입력', '결제'];
const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

export default function BookingPage() {
  const [step, setStep] = useState(1);

  const [date, setDate] = useState<string>('');
  const [avail, setAvail] = useState<FacilityAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState('2');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!(Number(count) >= 1)) e.count = '인원은 1명 이상이어야 합니다.';
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

        {/* 1단계: 슬롯 선택 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-ink">날짜 선택</h2>
              <p className="mt-1 text-sm text-muted">금·토만 운영합니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DATES.map((d) => (
                  <button
                    key={d.iso}
                    onClick={() => selectDate(d.iso)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                      date === d.iso
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-muted hover:border-accent/40'
                    }`}
                  >
                    {formatDateKorean(d.iso)}
                  </button>
                ))}
              </div>
            </div>

            {date && (
              <div>
                <h2 className="text-lg font-bold text-ink">시설·시간 선택</h2>
                {loadingAvail ? (
                  <p className="mt-3 text-sm text-subtle">불러오는 중…</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {avail.map((f) => (
                      <Card key={f.type} className="p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{f.name}</span>
                          <span className="font-bold text-ink">{formatWon(f.price)}</span>
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
                                    price: f.price,
                                    part: p.part,
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

            <Button size="lg" disabled={!selected} onClick={() => setStep(2)}>
              다음
            </Button>
          </div>
        )}

        {/* 2단계: 정보 입력 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-ink">예약자 정보</h2>
            <Field label="이름" error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </Field>
            <Field label="휴대폰 번호" error={errors.phone} hint="예약 조회·알림에 사용됩니다.">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                inputMode="numeric"
              />
            </Field>
            <Field label="인원" error={errors.count}>
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(e.target.value)}
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
        {step === 3 && selected && (
          <div className="space-y-4">
            <PaymentStep
              selected={selected}
              date={date}
              guest={{ name: name.trim(), phone: phone.trim(), count: Number(count) }}
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
