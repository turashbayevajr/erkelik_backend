import { useI18n } from '../i18n';
import type { WishStatus } from '../state/wishes';

const STYLES: Record<WishStatus, string> = {
  OPEN: 'bg-chip text-chipink',
  RESERVED: 'bg-accent text-onaccent',
  ORDERED: 'bg-accentwash border border-accentborder text-accent',
  FULFILLED: 'bg-successsoft text-success',
};

export function StatusBadge({ status }: { status: WishStatus }) {
  const { t } = useI18n();
  const label = {
    OPEN: t.statusOpen,
    RESERVED: t.statusReserved,
    ORDERED: t.statusOrdered,
    FULFILLED: t.statusFulfilled,
  }[status];
  return (
    <span
      className={`shrink-0 self-start rounded-full px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
