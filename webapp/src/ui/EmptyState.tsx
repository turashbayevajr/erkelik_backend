import { Icon } from './Icon';

function Sparkle({ className, size }: { className: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <path
        d="M50,8 Q54,46 92,50 Q54,54 50,92 Q46,54 8,50 Q46,46 50,8 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  text,
  steps,
}: {
  title: string;
  text: string;
  /** Короткие шаги «как начать» для первого входа. */
  steps?: string[];
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 pb-24 text-center">
      <div className="relative mb-[26px] h-[132px] w-[132px]">
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-accentsoft text-accent">
          <Icon name="gift" size={58} strokeWidth={1.5} />
        </div>
        <Sparkle className="absolute -top-[2px] right-[6px] text-accent" size={14} />
        <Sparkle className="absolute bottom-[6px] left-0 text-accentborder" size={9} />
      </div>
      <div className="mb-[10px] text-[22px] font-bold tracking-tight text-ink">
        {title}
      </div>
      <div className="max-w-[280px] text-[15px] leading-normal text-ink3">
        {text}
      </div>
      {steps && (
        <ol className="mt-6 flex w-full max-w-[300px] flex-col gap-3 text-left">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accentsoft text-[13px] font-bold text-accent">
                {i + 1}
              </span>
              <span className="min-w-0 pt-[2px] text-[14px] leading-[1.4] text-ink2">
                {step}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
