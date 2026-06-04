type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'bg-line-soft text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-[#e7f6ec] text-success',
  danger: 'bg-[#fdecec] text-danger',
  warning: 'bg-[#fff5e5] text-[#c2780f]',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
