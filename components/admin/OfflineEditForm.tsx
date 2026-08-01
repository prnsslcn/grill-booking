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

/**
 * 유선 예약 상세에서 현장 추가메뉴를 반영해 금액을 갱신한다.
 * 기본 상품가(base)는 보존: base = 현재 금액 − 기존 추가메뉴 합계. 새 금액 = base + 선택 추가메뉴 합계.
 */
export function OfflineEditForm({
  bookingId,
  bookingNumber,
  currentAmount,
  currentAddons,
  addonOptions,
}: {
  bookingId: string;
  bookingNumber: string;
  currentAmount: number;
  currentAddons: CurrentAddon[];
  addonOptions: AddonOpt[];
}) {
  const router = useRouter();

  // 기존 추가메뉴 합계·기본가(base)
  const oldAddonTotal = useMemo(
    () => currentAddons.reduce((s, a) => s + a.price * a.qty, 0),
    [currentAddons],
  );
  const base = currentAmount - oldAddonTotal;

  // 초기 수량: 기존 스냅샷 addons를 key로 매핑
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const a of currentAddons) if (a.key) init[a.key] = a.qty;
    return init;
  });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const newAddonTotal = addonOptions.reduce((s, a) => s + a.price * (qty[a.key] ?? 0), 0);
  const newAmount = base + newAddonTotal;
  const changed =
    newAmount !== currentAmount ||
    addonOptions.some((a) => (qty[a.key] ?? 0) !== (currentAddons.find((c) => c.key === a.key)?.qty ?? 0));

  function setQ(key: string, n: number) {
    setQty((prev) => ({ ...prev, [key]: Math.max(0, n) }));
    setOk(false);
  }

  function save() {
    setErr(null);
    setOk(false);
    const addons = Object.fromEntries(Object.entries(qty).filter(([, n]) => n > 0));
    startTransition(async () => {
      try {
        const res = await adminUpdateOfflineBooking({ bookingId, bookingNumber, addons });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setOk(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '알 수 없는 오류');
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {addonOptions.map((a) => {
          const n = qty[a.key] ?? 0;
          return (
            <div key={a.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">
                {a.label} <span className="text-xs text-subtle">+{a.price.toLocaleString('ko-KR')}원</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQ(a.key, n - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:bg-line-soft"
                  aria-label="감소"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={n}
                  onChange={(e) => setQ(a.key, Number(e.target.value))}
                  className="h-7 w-12 rounded-lg border border-line text-center text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setQ(a.key, n + 1)}
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
        disabled={pending || !changed}
        className="h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? '변경 중…' : '내용 변경 저장'}
      </button>
    </div>
  );
}
