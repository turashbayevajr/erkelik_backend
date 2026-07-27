import type { ReactNode } from 'react';

type Variant = 'primary' | 'muted' | 'soft' | 'outline';

const STYLES: Record<Variant, string> = {
  primary: 'bg-accent text-onaccent active:bg-accentpress',
  muted: 'bg-chip text-chipink',
  soft: 'bg-accentwash border border-accentborder text-accent',
  outline: 'bg-surface border border-line text-ink',
};

export function Button({
  variant = 'primary',
  children,
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  variant?: Variant;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 w-full items-center justify-center gap-[7px] rounded-[11px] text-[13.5px] font-semibold transition-colors disabled:pointer-events-none ${STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
