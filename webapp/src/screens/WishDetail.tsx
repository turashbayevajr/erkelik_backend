import { useState } from 'react';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import { confirmAction, showAlert } from '../telegram';
import {
  Button,
  Icon,
  MainButton,
  PhotoCarousel,
  StatusBadge,
  StatusStepper,
  TopBar,
} from '../ui';

// Детальный просмотр. context='owner' — тайна дарителя: без статуса
// брони и степпера. context='giver' — полный статус + действия.
export function WishDetailScreen({
  wishId,
  context,
}: {
  wishId: string;
  context: 'owner' | 'giver';
}) {
  const { t } = useI18n();
  const nav = useNav();
  const { find, markOrdered, markFulfilled, unreserve, removeWish } =
    useWishes();
  const [busy, setBusy] = useState(false);
  const wish = find(wishId);
  if (!wish) return null;

  const giver = context === 'giver';
  const showGiverStatus = giver && wish.status !== 'OPEN';
  const myReservation = giver && wish.reservedByMe && wish.status === 'RESERVED';

  // Любое действие: блокируем повторное нажатие, ошибку показываем человеку.
  const run = (action: () => Promise<void>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    void action()
      .then(() => after?.())
      .catch(() => showAlert(t.actionFailed))
      .finally(() => setBusy(false));
  };

  const remove = async () => {
    if (!(await confirmAction(t.confirmDelete))) return;
    run(() => removeWish(wish.id), nav.back);
  };

  const mainAction = myReservation ? (
    <MainButton
      label={t.markOrdered}
      icon={<Icon name="credit-card" size={17} />}
      disabled={busy}
      onClick={() => run(() => markOrdered(wish.id))}
    />
  ) : !giver && wish.status !== 'FULFILLED' ? (
    <MainButton
      label={t.markFulfilled}
      icon={<Icon name="gift-open" size={17} />}
      disabled={busy}
      onClick={() => run(() => markFulfilled(wish.id), nav.back)}
    />
  ) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        title={giver && wish.ownerLabel ? t.wishlistOf(wish.ownerLabel) : t.wish}
        onBack={nav.back}
        right={
          !giver && wish.status !== 'FULFILLED' ? (
            <button
              type="button"
              aria-label={t.edit}
              onClick={() => nav.push({ name: 'edit', wishId: wish.id })}
              className="flex h-9 w-9 items-center justify-center text-accent"
            >
              <Icon name="pencil" size={19} strokeWidth={2} />
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-[84px]">
        <PhotoCarousel photos={wish.images} label={t.photoOf} />
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-[21px] leading-[1.2] font-bold tracking-tight text-ink">
              {wish.name}
            </div>
            {showGiverStatus && <StatusBadge status={wish.status} />}
            {!giver && wish.status === 'FULFILLED' && (
              <StatusBadge status="FULFILLED" />
            )}
          </div>
          {wish.price && (
            <div className="mt-2 text-[22px] font-bold text-ink tabular-nums">
              {wish.price}
            </div>
          )}
        </div>
        {showGiverStatus && <StatusStepper status={wish.status} />}
        {wish.description && (
          <div className="text-[14.5px] leading-normal text-ink2">
            {wish.description}
          </div>
        )}
        {wish.url && wish.domain && (
          <Button
            variant="outline"
            className="!h-12 !rounded-[14px] !text-[15px]"
            onClick={() => window.open(wish.url, '_blank')}
          >
            {t.openOn(wish.domain)}
            <Icon name="external-link" size={16} className="text-ink3" />
          </Button>
        )}
        {myReservation && (
          <Button
            variant="muted"
            disabled={busy}
            onClick={() => run(() => unreserve(wish.id), nav.back)}
          >
            {t.cancelReservation}
          </Button>
        )}
        {!giver && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void remove()}
            className="mt-2"
          >
            {t.deleteWish}
          </Button>
        )}
      </div>
      {mainAction}
    </div>
  );
}
