'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { adminGenerateSlots } from '@/lib/admin/actions';

export function GenerateSlotsForm() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!from || !to) return;
    startTransition(async () => {
      const created = await adminGenerateSlots(from, to);
      setResult(`${created}개 슬롯 생성됨 (금·토만)`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="text-sm">
        <span className="mb-1 block font-medium text-ink">시작일</span>
        <DatePicker defaultValue={from} onChange={setFrom} />
      </div>
      <div className="text-sm">
        <span className="mb-1 block font-medium text-ink">종료일</span>
        <DatePicker defaultValue={to} onChange={setTo} />
      </div>
      <Button onClick={submit} disabled={pending || !from || !to}>
        {pending ? '생성 중…' : '슬롯 생성'}
      </Button>
      {result && <span className="text-sm text-success">{result}</span>}
    </div>
  );
}
