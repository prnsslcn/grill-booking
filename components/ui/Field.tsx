import type { InputHTMLAttributes, ReactNode } from 'react';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft ${className}`}
      {...props}
    />
  );
}
