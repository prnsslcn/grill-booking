'use client';

import { useMemo, useState, useTransition } from 'react';

import { adminCreateBooking } from '@/lib/admin/actions';
import { BEEF_ENABLED } from '@/lib/config';
import { formatPhone } from '@/lib/format';

interface FacilityOpt {
  type: string;
  name: string;
  capacity: number;
}
interface AddonOpt {
  key: string;
  label: string;
  price: number;
}

/** 선택한 날짜에 유선(오프라인) 예약을 직접 등록하는 폼. 성공 시 서버 revalidate로 보드 갱신. */
export function OfflineBookingForm({
  date,
  facilities,
  addons,
  defaultPart,
}: {
  date: string;
  facilities: FacilityOpt[];
  addons: AddonOpt[];
  defaultPart: number;
}) {
  // 상품 목록: 각 시설 + 특가 프리셋(타프 4인). amount가 있으면 시설 기본가 대신 그 값으로 등록.
  const products = useMemo(() => {
    const list: {
      key: string;
      facilityType: string;
      label: string;
      guests: number;
      amount?: number;
    }[] = [];
    for (const f of facilities) {
      list.push({ key: f.type, facilityType: f.type, label: `${f.name} · ${f.capacity}인`, guests: f.capacity });
      if (f.type === 'tarp_tent') {
        list.push({
          key: 'tarp_tent_4',
          facilityType: 'tarp_tent',
          label: '타프 텐트 · 4인 특가 (130,000원)',
          guests: 4,
          amount: 130000,
        });
      }
    }
    return list;
  }, [facilities]);

  const [productKey, setProductKey] = useState(products[0]?.key ?? '');
  const product = products.find((p) => p.key === productKey) ?? products[0];
  const [part, setPart] = useState(defaultPart);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState(products[0]?.guests ?? 4);
  const [meat, setMeat] = useState<'pork' | 'beef'>('pork');
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState('유선 예약');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function onProduct(key: string) {
    setProductKey(key);
    const p = products.find((x) => x.key === key);
    if (p) setGuestCount(p.guests);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    if (!guestName.trim()) {
      setErr('예약자명을 입력하세요.');
      return;
    }
    const addons = Object.fromEntries(
      Object.entries(addonQty).filter(([, qty]) => qty > 0),
    );
    startTransition(async () => {
      try {
        const res = await adminCreateBooking({
          facilityType: product?.facilityType ?? '',
          date,
          part,
          guestName,
          guestPhone,
          guestCount,
          meat,
          note,
          addons,
          amount: product?.amount,
        });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setOk(true);
        setGuestName('');
        setGuestPhone('');
        setAddonQty({});
      } catch (e) {
        // 네트워크·직렬화 등 예기치 못한 오류만 여기로 온다(도메인 사유는 res.error).
        setErr(e instanceof Error ? e.message : '알 수 없는 오류');
      }
    });
  }

  const inputCls =
    'h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-accent';

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">상품</span>
          <select value={productKey} onChange={(e) => onProduct(e.target.value)} className={inputCls}>
            {products.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">부</span>
          <select value={part} onChange={(e) => setPart(Number(e.target.value))} className={inputCls}>
            <option value={1}>1부 (17:00~19:00)</option>
            <option value={2}>2부 (19:30~21:30)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">예약자명</span>
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputCls} placeholder="홍길동" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">연락처</span>
          <input
            value={guestPhone}
            onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
            className={inputCls}
            placeholder="010-0000-0000"
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">인원</span>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">고기 세트</span>
          <select value={meat} onChange={(e) => setMeat(e.target.value as 'pork' | 'beef')} className={inputCls}>
            <option value="pork">Pork</option>
            {BEEF_ENABLED && <option value="beef">Beef</option>}
          </select>
        </label>
      </div>
      {addons.length > 0 && (
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">고기 추가 (선택)</span>
          <div className="space-y-1.5">
            {addons.map((a) => {
              const qty = addonQty[a.key] ?? 0;
              const setQty = (n: number) =>
                setAddonQty((prev) => ({ ...prev, [a.key]: Math.max(0, n) }));
              return (
                <div key={a.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink">
                    {a.label}{' '}
                    <span className="text-xs text-subtle">
                      +{a.price.toLocaleString('ko-KR')}원
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                      aria-label="감소"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="h-7 w-12 rounded-lg border border-line text-center text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                      aria-label="증가"
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

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">메모</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="유선 예약 / 요청사항" />
      </label>

      {err && <p className="text-sm font-medium text-danger">{err}</p>}
      {ok && <p className="text-sm font-medium text-success">예약이 추가되었습니다.</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? '추가 중…' : '유선 예약 추가'}
      </button>
    </form>
  );
}
