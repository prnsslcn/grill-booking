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

const DEFAULT_NOTE = '유선 예약';
const COMBINED_NOTE = '시설 이용 추가 비용 지불 후 연장';

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
  const [note, setNote] = useState(DEFAULT_NOTE);
  // 무상(지인) 예약: 슬롯은 점유하되 금액 0원·매출 미집계
  const [isComp, setIsComp] = useState(false);
  // 1·2부 통합(연장): part===0. 시설 이용 추가 금액을 별도 입력.
  const combined = part === 0;
  const [facilityFee, setFacilityFee] = useState(0);
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
          comp: isComp,
          combined,
          facilityFee: combined ? facilityFee : undefined,
        });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setOk(true);
        setGuestName('');
        setGuestPhone('');
        setAddonQty({});
        // 지인(무상) 체크는 완료 후 자동 해제 — 다음 등록은 기본(유선)으로
        if (isComp) setIsComp(false);
        // 통합 예약은 완료 후 부·이용료·메모 초기화
        if (combined) {
          setPart(defaultPart);
          setFacilityFee(0);
        }
        setNote(DEFAULT_NOTE);
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
          <select
            value={part}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPart(v);
              // 통합 선택 시 메모 자동 삽입, 해제 시 자동 메모였으면 기본값 복귀
              if (v === 0) setNote(COMBINED_NOTE);
              else setNote((n) => (n === COMBINED_NOTE ? DEFAULT_NOTE : n));
            }}
            className={inputCls}
          >
            <option value={1}>1부 (17:00~19:00)</option>
            <option value={2}>2부 (19:30~21:30)</option>
            <option value={0}>1·2부 통합 (연장)</option>
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

      {combined && (
        <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-3 text-sm">
          <span className="mb-1 block font-medium text-ink">시설 이용 추가 금액</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={10000}
              value={facilityFee}
              onChange={(e) => setFacilityFee(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              className={inputCls}
            />
            <span className="text-subtle">원</span>
            <button
              type="button"
              onClick={() => setFacilityFee((v) => v + 10000)}
              className="h-10 flex-none rounded-lg border border-line px-3 text-xs font-medium text-ink hover:bg-line-soft"
            >
              +1만
            </button>
            <button
              type="button"
              onClick={() => setFacilityFee(0)}
              className="h-10 flex-none rounded-lg border border-line px-3 text-xs font-medium text-muted hover:bg-line-soft"
            >
              0
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            1·2부 두 타임을 한 동으로 점유합니다. 이용료는 10,000원 단위로 입력하며 최종 금액에 더해집니다.
          </p>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">메모</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="유선 예약 / 요청사항" />
      </label>

      {/* 무상(지인) 예약 — 슬롯 점유·매출 미집계 */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-line-soft/40 p-3">
        <input
          type="checkbox"
          checked={isComp}
          onChange={(e) => {
            setIsComp(e.target.checked);
            setNote(e.target.checked ? '지인 예약(무상)' : '유선 예약');
          }}
          className="mt-0.5 h-4 w-4 accent-accent"
        />
        <span className="text-sm">
          <span className="font-medium text-ink">지인 예약 (무상)</span>
          <span className="mt-0.5 block text-xs text-muted">
            자리만 점유하고 <strong className="text-ink">금액 0원</strong>으로 등록됩니다. 매출·정산에는 잡히지 않습니다.
          </span>
        </span>
      </label>

      {err && <p className="text-sm font-medium text-danger">{err}</p>}
      {ok && <p className="text-sm font-medium text-success">예약이 추가되었습니다.</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending
          ? '추가 중…'
          : isComp
            ? '지인 예약 추가'
            : combined
              ? '1·2부 통합 예약 추가'
              : '유선 예약 추가'}
      </button>
    </form>
  );
}
