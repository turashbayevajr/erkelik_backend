import { Card } from './Card';
import { Thumb } from './Thumb';
import { Icon } from './Icon';
import { StatusBadge } from './Badge';
import type { Wish } from '../state/wishes';

function WishInfo({ wish }: { wish: Wish }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[15px] leading-[1.25] font-semibold text-ink line-clamp-2">
        {wish.name}
      </div>
      {wish.price && (
        <div className="mt-[3px] text-[15px] font-bold text-ink tabular-nums">
          {wish.price}
        </div>
      )}
      {wish.domain && (
        <div className="mt-[6px] flex items-center gap-[5px] text-ink3">
          <Icon name="globe" size={13} />
          <span className="truncate text-[12px]">{wish.domain}</span>
        </div>
      )}
    </div>
  );
}

// Карточка в «моих желаниях»: владелец не видит статус брони —
// бейдж показывает только Открыто/Подарено.
export function WishCard({ wish, onClick }: { wish: Wish; onClick?: () => void }) {
  const ownerStatus = wish.status === 'FULFILLED' ? 'FULFILLED' : 'OPEN';
  return (
    <Card onClick={onClick} className="flex items-center gap-3">
      <Thumb imageUrl={wish.imageUrl} />
      <WishInfo wish={wish} />
      <StatusBadge status={ownerStatus} />
    </Card>
  );
}

// Карточка чужого вишлиста: вместо бейджа — экшен-слот дарителя.
export function GiftCard({
  wish,
  action,
  onClick,
}: {
  wish: Wish;
  action: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card className="flex flex-col gap-[11px]">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 text-left"
      >
        <Thumb imageUrl={wish.imageUrl} size={60} radius={13} />
        <WishInfo wish={wish} />
      </button>
      {action}
    </Card>
  );
}
