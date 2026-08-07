import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import type { Wish } from '../state/wishes';
import { useSocial } from '../state/social';
import {
  Button,
  Combobox,
  GiftCard,
  Icon,
  MainButton,
  SecrecyBanner,
  Spinner,
  TopBar,
} from '../ui';
import type { ComboOption } from '../ui';

// Экшен-слот карточки чужого вишлиста по статусу и «моя ли бронь».
function GiftAction({ wish }: { wish: Wish }) {
  const { t } = useI18n();
  const nav = useNav();
  const { friendName, reserve, unreserve } = useWishes();

  if (wish.status === 'RESERVED' && wish.reservedByMe) {
    return (
      <div className="flex h-10 items-center justify-between rounded-[11px] bg-accent px-[14px] text-onaccent">
        <span className="flex items-center gap-[7px] text-[13.5px] font-semibold">
          <Icon name="heart" size={16} filled />
          {t.youGift}
        </span>
        <button
          type="button"
          onClick={() => void unreserve(wish.id)}
          className="text-[12px] font-medium opacity-85"
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

  if (wish.status === 'ORDERED') {
    return (
      <Button variant="soft" disabled>
        <Icon name="credit-card" size={15} />
        {t.orderedByGiver}
      </Button>
    );
  }

  return (
    <Button variant="muted" disabled>
      <Icon name="lock" size={15} />
      {t.reservedByOther}
    </Button>
  );
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
        {friendWishes.map((wish) => (
          <GiftCard
            key={wish.id}
            wish={wish}
            action={<GiftAction wish={wish} />}
            onClick={() =>
              nav.push({ name: 'detail', wishId: wish.id, context: 'giver' })
            }
          />
        ))}
      </div>
    </div>
  );
}
