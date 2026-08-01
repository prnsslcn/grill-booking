'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { adminUpdateOfflineBooking } from '@/lib/admin/actions';
import { formatWon } from '@/lib/format';

interface AddonOpt {
  key: string;
  label: string;
  price: number;
}
interface CurrentAddon {
  key?: string;
  label: string;
  qty: number;
  price: number;
}
interface Extra {
  label: string;
  amount: number;
}

const PRESETS: Extra[] = [
  { label: '캔음료', amount: 2500 },
  { label: '생수', amount: 1500 },
];

/**
 * 유선 예약 상세에서 현장 추가메뉴(고기) + 현장 추가/조정(캔음료·생수·임의·할인)을 반영해 금액 갱신.
 * base(기본 상품가) 보존: base = 현재 금액 − 기존 추가메뉴 − 기존 추가/조정. 새 금액 = base + 새 합계.
 */
export function OfflineEditForm({
  bookingId,
  bookingNumber,
  currentAmount,
  currentAddons,
  currentExtras,
  addonOptions,
}: {
  bookingId: string;
  bookingNumber: string;
  currentAmount: number;
  currentAddons: CurrentAddon[];
  currentExtras: Extra[];
  addonOptions: AddonOpt[];
}) {
  const router = useRouter();

  const oldAddonTotal = useMemo(
    () => currentAddons.reduce((s, a) => s + a.price * a.qty, 0),
    [currentAddons],
  );
  const oldExtrasTotal = useMemo(
    () => currentExtras.reduce((s, e) => s + e.amount, 0),
    [currentExtras],
  );
  const base = currentAmount - oldAddonTotal - oldExtrasTotal;

  const [qty, setQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const a of currentAddons) if (a.key) init[a.key] = a.qty;
    return init;
  });
  const [extras, setExtras] = useState<Extra[]>(() => currentExtras.map((e) => ({ ...e })));
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const newAddonTotal = addonOptions.reduce((s, a) => s + a.price * (qty[a.key] ?? 0), 0);
  const newExtrasTotal = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const newAmount = base + newAddonTotal + newExtrasTotal;

  function touch() {
    setDirty(true);
    setOk(false);
  }
  function setQ(key: string, n: number) {
    setQty((prev) => ({ ...prev, [key]: Math.max(0, n) }));
    touch();
  }
  function addExtra(e: Extra) {
    setExtras((prev) => [...prev, { ...e }]);
    touch();
  }
  function updateExtra(i: number, patch: Partial<Extra>) {
    setExtras((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
    touch();
  }
  function removeExtra(i: number) {
    setExtras((prev) => prev.filter((_, idx) => idx !== i));
    touch();
  }

  function save() {
    setErr(null);
    setOk(false);
    const addons = Object.fromEntries(Object.entries(qty).filter(([, n]) => n > 0));
    const cleanExtras = extras
      .map((e) => ({ label: e.label.trim(), amount: Math.trunc(Number(e.amount) || 0) }))
      .filter((e) => e.label !== '' || e.amount !== 0);
    startTransition(async () => {
      try {
        const res = await adminUpdateOfflineBooking({ bookingId, bookingNumber, addons, extras: cleanExtras });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setOk(true);
        setDirty(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '알 수 없는 오류');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 추가메뉴(고기) */}
      {addonOptions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-subtle">추가 메뉴 (고기)</p>
          {addonOptions.map((a) => {
            const n = qty[a.key] ?? 0;
            return (
              <div key={a.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink">
                  {a.label} <span className="text-xs text-subtle">+{a.price.toLocaleString('ko-KR')}원</span>
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setQ(a.key, n - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft" aria-label="감소">−</button>
                  <input type="number" min={0} value={n} onChange={(e) => setQ(a.key, Number(e.target.value))} className="h-7 w-12 rounded-lg border border-line text-center text-sm outline-none focus:border-accent" />
                  <button type="button" onClick={() => setQ(a.key, n + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft" aria-label="증가">+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 현장 추가/조정 (POS 캔음료·생수·임의·할인) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="mr-1 text-xs font-semibold text-subtle">현장 추가/조정</p>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => addExtra(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-line-soft">
              {p.label} +{p.amount.toLocaleString('ko-KR')}
            </button>
          ))}
          <button type="button" onClick={() => addExtra({ label: '', amount: 0 })} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-line-soft">
            직접 추가
          </button>
          <button type="button" onClick={() => addExtra({ label: '현장 할인', amount: 0 })} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-line-soft">
            할인(−)
          </button>
        </div>

        {extras.length > 0 && (
          <div className="space-y-1.5">
            {extras.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={e.label}
                  onChange={(ev) => updateExtra(i, { label: ev.target.value })}
                  placeholder="항목명 (예: 캔음료)"
                  className="h-8 flex-1 rounded-lg border border-line px-2.5 text-sm outline-none focus:border-accent"
                />
                <input
                  type="number"
                  value={e.amount}
                  onChange={(ev) => updateExtra(i, { amount: Number(ev.target.value) })}
                  placeholder="금액(±)"
                  className="h-8 w-24 rounded-lg border border-line px-2.5 text-right text-sm outline-none focus:border-accent"
                />
                <span className="text-xs text-subtle">원</span>
                <button type="button" onClick={() => removeExtra(i)} className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft" aria-label="삭제">×</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-subtle">할인은 금액을 음수로 입력하세요 (예: −10000). 월말보고 금액에 그대로 반영됩니다.</p>
      </div>

      {/* 변경 후 금액 */}
      <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-muted">변경 후 금액</span>
        <span className="text-base font-bold text-ink">
          {formatWon(newAmount)}
          {newAmount !== currentAmount && (
            <span className="ml-1.5 text-xs font-semibold text-accent-strong">
              ({newAmount > currentAmount ? '+' : ''}
              {formatWon(newAmount - currentAmount)})
            </span>
          )}
        </span>
      </div>

      {err && <p className="text-sm font-medium text-danger">{err}</p>}
      {ok && <p className="text-sm font-medium text-success">변경되었습니다.</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty || newAmount < 0}
        className="h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? '변경 중…' : '내용 변경 저장'}
      </button>
    </div>
  );
}
