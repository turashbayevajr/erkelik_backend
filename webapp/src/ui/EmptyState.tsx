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

export function EmptyState({ title, text }: { title: string; text: string }) {
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
    </div>
  );
}
