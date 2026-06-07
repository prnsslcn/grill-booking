'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { adminUpdateFacility } from '@/lib/admin/actions';
import type { FacilityType } from '@/types/domain';

export function FacilityEditor({
  type,
  name,
  pricePork,
  priceBeef,
  isActive,
}: {
  type: FacilityType;
  name: string;
  pricePork: number;
  priceBeef: number;
  isActive: boolean;
}) {
  const [pork, setPork] = useState(String(pricePork));
  const [beef, setBeef] = useState(String(priceBeef));
  const [active, setActive] = useState(isActive);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    const p = Number(pork);
    const b = Number(beef);
    if (!Number.isInteger(p) || p < 0 || !Number.isInteger(b) || b < 0) return;
    setSaved(false);
    startTransition(async () => {
      await adminUpdateFacility(type, { pricePork: p, priceBeef: b, isActive: active });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <span className="w-40 font-semibold text-ink">{name}</span>
      <label className="flex items-center gap-2 text-sm text-muted">
        돼지
        <Input
          type="number"
          min={0}
          value={pork}
          onChange={(e) => {
            setPork(e.target.value);
            setSaved(false);
          }}
          className="h-10 w-32"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        소
        <Input
          type="number"
          min={0}
          value={beef}
          onChange={(e) => {
            setBeef(e.target.value);
            setSaved(false);
          }}
          className="h-10 w-32"
        />
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
