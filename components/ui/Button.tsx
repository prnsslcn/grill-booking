import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-accent-soft text-accent hover:bg-[#d8eafe]',
  ghost: 'bg-transparent text-muted hover:bg-line-soft',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-14 px-6 text-base w-full',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}
