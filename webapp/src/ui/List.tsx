import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function ListGroup({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {caption && (
        <div className="mx-[6px] mb-2 font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
          {caption}
        </div>
      )}
      <div className="divide-y divide-linesoft overflow-hidden rounded-2xl bg-surface">
        {children}
      </div>
    </div>
  );
}

export function ListRow({
  label,
  selected = false,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-[14px] text-left"
    >
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${selected ? 'font-medium text-ink' : 'text-ink2'}`}
      >
        {label}
      </span>
      {selected && (
        <Icon name="check" size={19} strokeWidth={2.6} className="shrink-0 text-accent" />
      )}
    </button>
  );
}

export function RowWithAction({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">{title}</div>
        {subtitle && (
          <div className="mt-px truncate text-[12.5px] text-ink3">{subtitle}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ActionRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-[14px] text-left"
    >
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-accent text-onaccent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{title}</div>
        {subtitle && (
          <div className="mt-px truncate text-[12.5px] text-ink3">{subtitle}</div>
        )}
      </div>
      <Icon name="chevron-right" size={20} className="shrink-0 text-ink3" />
    </button>
  );
}
