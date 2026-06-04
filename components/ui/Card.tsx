import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
      {...props}
    />
  );
}
