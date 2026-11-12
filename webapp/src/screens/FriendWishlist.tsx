import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import type { Wish } from '../state/wishes';
import { useSocial } from '../state/social';
import {
  Button,
  Combobox,
  Icon,
  MainButton,
  Masonry,
  PinCard,
  SecrecyBanner,
  Spinner,
  StatusBadge,
  TopBar,
  pinRatio,
} from '../ui';
import type { ComboOption } from '../ui';

// Экшен-слот карточки чужого вишлиста по статусу и «моя ли бронь».
function GiftAction({ wish }: { wish: Wish }) {
  const { t } = useI18n();
  const nav = useNav();
  const { friendName, reserve, unreserve } = useWishes();

  if (wish.status === 'RESERVED' && wish.reservedByMe) {
    return (
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-2 rounded-[11px] bg-accent px-3 py-[6px] text-onaccent">
        <span className="flex min-w-0 items-center gap-[6px] text-[13.5px] font-semibold">
          <Icon name="heart" size={16} filled />
          {t.youGift}
        </span>
        <button
          type="button"
          onClick={() => void unreserve(wish.id)}
          className="text-[13px] font-medium opacity-90"
        >
          {t.cancel}
        </button>
      </div>
    );
  }

  if (wish.status === 'OPEN') {
    return (
      <Button
        onClick={() => {
          void reserve(wish.id)
            .then(() => nav.push({ name: 'reserved', ownerName: friendName }))
            .catch(() => {});
        }}
      >
        <Icon name="gift-open" size={16} />
        {t.reserve}
      </Button>
    );
  }

  // Остальные статусы — бейджем в подписи карточки (см. giverBadge).
  return null;
}

function giverBadge(wish: Wish) {
  if (wish.status === 'OPEN') return undefined;
  if (wish.status === 'RESERVED' && wish.reservedByMe) return undefined;
  return <StatusBadge status={wish.status} />;
}

// Без выбранного друга — поиск по @username с выбором из своих друзей
// в том же поле.
function FriendLookup() {
  const { t } = useI18n();
  const nav = useNav();
  const { openFriend, friendLoading, friendNotFound } = useWishes();
  const { friends } = useSocial();
  const [username, setUsername] = useState('');

  // Друг без username недоступен: чужой вишлист ищется только по нему.
  const options: ComboOption[] = friends
    .filter((f) => f.username)
    .map((f) => ({
      value: f.username,
      title: f.name,
      subtitle: `@${f.username}`,
    }));

  const open = (value: string) => void openFriend(value);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.friendLookupTitle} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-[18px] pb-[84px]">
        <div className="px-1 text-[14px] leading-normal text-ink3">
          {t.friendLookupText}
        </div>
        <Combobox
          label={t.friendLookupTitle}
          value={username}
          onChange={setUsername}
          onPick={(option) => open(option.value)}
          options={options}
          placeholder={t.friendLookupPlaceholder}
          icon="user"
          listCaption={t.friendLookupPick}
        />
        {friendNotFound && (
          <div className="px-1 text-[13px] text-accent">{t.friendNotFound}</div>
        )}
      </div>
      <MainButton
        label={t.friendLookupCta}
        onClick={() => open(username)}
        disabled={username.trim().replace(/^@/, '').length === 0 || friendLoading}
      />
    </div>
  );
}

export function FriendWishlistScreen({ username }: { username?: string }) {
  const { t } = useI18n();
  const nav = useNav();
  const {
    friendUsername,
    friendName,
    friendWishes,
    friendLoading,
    openFriend,
    subscribedToFriend,
    toggleSubscribe,
    friendRequestSent,
    sendFriendRequest,
  } = useWishes();

  // Открытие по share-ссылке (start_param) или прямому переходу.
  useEffect(() => {
    if (username && username !== friendUsername) void openFriend(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (friendLoading && !friendUsername) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!friendUsername) return <FriendLookup />;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.wishlistOf(friendName)} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-[11px] px-[14px] pt-4 pb-[18px]">
        <SecrecyBanner text={t.secrecyNote(friendName)} />
        <div className="flex gap-2">
          <Button
            variant={subscribedToFriend ? 'soft' : 'primary'}
            onClick={() => void toggleSubscribe()}
          >
            <Icon name={subscribedToFriend ? 'check' : 'heart'} size={15} />
            {subscribedToFriend ? t.subscribed : t.subscribe}
          </Button>
          <Button
            variant={friendRequestSent ? 'muted' : 'outline'}
            disabled={friendRequestSent}
            onClick={() => void sendFriendRequest()}
          >
            <Icon name="user" size={15} />
            {friendRequestSent ? t.friendRequestSent : t.addFriend}
          </Button>
        </div>
        <Masonry
          items={friendWishes}
          getKey={(wish) => wish.id}
          getRatio={pinRatio}
          captionHeight={110}
          renderItem={(wish) => (
            <PinCard
              wish={wish}
              badge={giverBadge(wish)}
              footer={
                giverBadge(wish) ? undefined : <GiftAction wish={wish} />
              }
              onClick={() =>
                nav.push({ name: 'detail', wishId: wish.id, context: 'giver' })
              }
            />
          )}
        />
      </div>
    </div>
  );
}
