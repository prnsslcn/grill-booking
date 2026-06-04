'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { adminUpdateFacility } from '@/lib/admin/actions';
import type { FacilityType } from '@/types/domain';

export function FacilityEditor({
  type,
  name,
  price,
  isActive,
}: {
  type: FacilityType;
  name: string;
  price: number;
  isActive: boolean;
}) {
  const [priceInput, setPriceInput] = useState(String(price));
  const [active, setActive] = useState(isActive);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    const p = Number(priceInput);
    if (!Number.isInteger(p) || p < 0) return;
    setSaved(false);
    startTransition(async () => {
      await adminUpdateFacility(type, { price: p, isActive: active });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <span className="w-28 font-semibold text-ink">{name}</span>
      <label className="flex items-center gap-2 text-sm text-muted">
        가격
        <Input
          type="number"
          min={0}
          value={priceInput}
          onChange={(e) => {
            setPriceInput(e.target.value);
            setSaved(false);
          }}
          className="h-10 w-32"
        />
        원
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            setActive(e.target.checked);
            setSaved(false);
          }}
          className="h-4 w-4 accent-accent"
        />
        판매중
      </label>
      <Button onClick={save} disabled={pending} className="h-10">
        {pending ? '저장 중…' : '저장'}
      </Button>
      {saved && <span className="text-sm text-success">저장됨</span>}
    </div>
  );
}
