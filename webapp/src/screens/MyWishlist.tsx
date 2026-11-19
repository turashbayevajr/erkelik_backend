import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import type { Wish } from '../state/wishes';
import {
  EmptyState,
  Icon,
  Logo,
  Masonry,
  MainButton,
  PinCard,
  Segmented,
  Spinner,
  StatusBadge,
  pinRatio,
} from '../ui';

// «Я дарю»: мои брони у друзей. Статус брони показываем — это мои
// собственные брони, тайна дарителя касается только владельца желания.
function GiftsTab() {
  const { t } = useI18n();
  const nav = useNav();
  const { reservations, loadReservations } = useWishes();

  useEffect(() => {
    void loadReservations().catch(() => {});
  }, [loadReservations]);

  if (reservations === null) {
    return (
      <div className="flex flex-1 items-center justify-center pt-16">
        <Spinner />
      </div>
    );
  }
  if (reservations.length === 0) {
    return <EmptyState title={t.giftsEmptyTitle} text={t.giftsEmptyText} />;
  }
  return (
    <Masonry
      items={reservations}
      getKey={(wish) => wish.id}
      getRatio={pinRatio}
      captionHeight={84}
      renderItem={(wish: Wish) => (
        <PinCard
          wish={wish}
          subtitle={wish.ownerLabel}
          badge={<StatusBadge status={wish.status} />}
          onClick={() =>
            nav.push({ name: 'detail', wishId: wish.id, context: 'giver' })
          }
        />
      )}
    />
  );
}

function MineTab() {
  const { t } = useI18n();
  const nav = useNav();
  const { myWishes } = useWishes();

  if (myWishes.length === 0) {
    return (
      <EmptyState
        title={t.emptyTitle}
        text={t.emptyText}
        steps={t.onboardingSteps}
      />
    );
  }
  return (
    <Masonry
      items={myWishes}
      getKey={(wish) => wish.id}
      getRatio={pinRatio}
      renderItem={(wish) => (
        // Тайна дарителя: владелец видит только «Подарено».
        <PinCard
          wish={wish}
          badge={
            wish.status === 'FULFILLED' ? (
              <StatusBadge status="FULFILLED" />
            ) : undefined
          }
          onClick={() =>
            nav.push({ name: 'detail', wishId: wish.id, context: 'owner' })
          }
        />
      )}
    />
  );
}

export function MyWishlistScreen() {
  const { t } = useI18n();
  const nav = useNav();
  const { myWishes, clearFriend, homeTab, setHomeTab } = useWishes();
  const openFriend = () => {
    clearFriend();
    nav.push({ name: 'friend' });
  };

  return (
    <div className="flex min-h-dvh flex-col px-[14px] pt-[18px] pb-[84px]">
      <div className="flex items-center justify-between px-1 pb-3">
        <Logo size={22} />
        <div className="flex items-center gap-4 text-ink3">
          <button type="button" aria-label={t.openFriendWishlist} onClick={openFriend}>
            <Icon name="gift-open" size={21} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label={t.profile}
            onClick={() => nav.push({ name: 'profile' })}
          >
            <Icon name="user" size={21} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="pb-3">
        <Segmented
          options={[
            {
              value: 'mine',
              label: myWishes.length
                ? `${t.tabMine} · ${myWishes.length}`
                : t.tabMine,
            },
            { value: 'gifts', label: t.tabGifts },
          ]}
          value={homeTab}
          onChange={setHomeTab}
        />
      </div>

      {homeTab === 'mine' ? <MineTab /> : <GiftsTab />}

      {homeTab === 'mine' ? (
        <MainButton
          label={myWishes.length ? t.addWish : t.addFirstWish}
          icon={<Icon name="plus" size={19} strokeWidth={2.4} />}
          onClick={() => nav.push({ name: 'add' })}
        />
      ) : (
        <MainButton
          label={t.openFriendWishlist}
          icon={<Icon name="gift-open" size={19} strokeWidth={2} />}
          onClick={openFriend}
        />
      )}
    </div>
  );
}
