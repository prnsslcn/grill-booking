'use client';

import { useState } from 'react';

import { Calendar } from '@/components/booking/Calendar';
import { formatDateKorean } from '@/lib/format';

/**
 * 팝오버 날짜 선택기. 브라우저 기본 date 팝업 대신 우리 Calendar를 띄운다.
 * - GET 폼: name 지정 시 hidden input으로 값 제출.
 * - 클라이언트 폼: onChange로 값 전달.
 * 관리자 용도라 모든 요일·과거 날짜 선택 가능.
 */
export function DatePicker({
  name,
  defaultValue = '',
  placeholder = '연도. 월. 일.',
  onChange,
  allowClear = false,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (iso: string) => void;
  allowClear?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  function pick(iso: string) {
    setValue(iso);
    onChange?.(iso);
    setOpen(false);
  }
  function clear() {
    setValue('');
    onChange?.('');
    setOpen(false);
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-44 items-center justify-between rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
      >
        <span className={value ? 'text-ink' : 'text-subtle'}>
          {value ? formatDateKorean(value) : placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-12 z-50 w-72">
            <Calendar value={value} onSelect={pick} />
            {allowClear && value && (
              <button
                type="button"
                onClick={clear}
                className="mt-1 w-full rounded-lg py-2 text-xs font-medium text-muted hover:bg-line-soft"
              >
                날짜 지우기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
