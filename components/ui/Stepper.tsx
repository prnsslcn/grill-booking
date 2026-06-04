export function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex items-center gap-2">
      {labels.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-accent text-white'
                  : done
                    ? 'bg-accent-soft text-accent'
                    : 'bg-line-soft text-subtle'
              }`}
            >
              {step}
            </span>
            <span
              className={`text-sm font-medium ${active ? 'text-ink' : 'text-subtle'} hidden sm:inline`}
            >
              {label}
            </span>
            {step < labels.length && <span className="h-px flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
