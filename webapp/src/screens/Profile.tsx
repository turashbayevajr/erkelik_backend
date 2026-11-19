import { useState } from 'react';
import { fetchBotInfo } from '../api';
import { LOCALE_LABELS, useI18n } from '../i18n';
import { shareLink } from '../telegram';
import type { Locale } from '../i18n';
import { useNav } from '../state/nav';
import { useAuth } from '../state/auth';
import { useSocial } from '../state/social';
import { useWishes } from '../state/wishes';
import {
  ActionRow,
  Avatar,
  Button,
  Icon,
  ListGroup,
  ListRow,
  MainButton,
  RowWithAction,
  Segmented,
  TopBar,
} from '../ui';

const LOCALES: Locale[] = ['RU', 'KK', 'EN'];

export function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const nav = useNav();
  const { me, updateMe } = useAuth();
  const { clearFriend } = useWishes();
  const {
    friends,
    subscribers,
    requests,
    acceptRequest,
    defaultVisibility,
    setDefaultVisibility,
  } = useSocial();

  const displayName = me?.firstName || me?.username || '—';

  // Подсказка под строкой «Поделиться»: нет username / ссылка скопирована.
  const [shareNote, setShareNote] = useState<string | null>(null);

  // Ссылка t.me/<бот>?start=<username>: друг попадает сразу в ваш вишлист.
  const share = async () => {
    if (!me?.username) {
      setShareNote(t.shareNeedsUsername);
      return;
    }
    try {
      const bot = await fetchBotInfo();
      const url = `https://t.me/${bot.username}?start=${me.username}`;
      const result = await shareLink(url, t.shareInvite);
      setShareNote(
        result === 'copied'
          ? t.linkCopied
          : result === 'failed'
            ? url
            : null,
      );
    } catch {
      setShareNote(t.shareFailed);
    }
  };

  const pickLocale = (l: Locale) => {
    setLocale(l);
    void updateMe({ preferredLocale: l }).catch(() => {});
  };

  // Открыть чужой вишлист можно только по username — у кого его нет,
  // строка остаётся некликабельной.
  const openWishlist = (username: string) => {
    clearFriend();
    nav.push({ name: 'friend', username });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.profile} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-[22px] px-4 pt-5 pb-[84px]">
        <div className="flex items-center gap-[14px]">
          <Avatar name={displayName} />
          <div className="min-w-0">
            <div className="truncate text-[19px] font-bold text-ink">
              {displayName}
            </div>
            {me?.username && (
              <div className="mt-px truncate text-[14px] text-ink3">
                @{me.username}
              </div>
            )}
          </div>
        </div>

        <ActionRow
          icon={<Icon name="share" size={20} />}
          title={t.shareWishlist}
          subtitle={t.shareWishlistSub}
          onClick={() => void share()}
        />
        {shareNote && (
          <div className="-mt-2 px-2 text-[13px] leading-[1.4] break-all text-ink3">
            {shareNote}
          </div>
        )}

        <div>
          <div className="mx-[6px] mb-2 font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
            {t.defaultVisibility}
          </div>
          <Segmented
            options={[
              { value: 'PUBLIC', label: t.visPublic },
              { value: 'FRIENDS', label: t.visFriends },
              { value: 'CUSTOM', label: t.visCustom },
            ]}
            value={defaultVisibility}
            onChange={setDefaultVisibility}
          />
        </div>

        {requests.length > 0 && (
          <ListGroup caption={t.requestsSection}>
            {requests.map((r) => (
              <RowWithAction
                key={r.id}
                title={r.name}
                subtitle={`@${r.username}`}
                action={
                  <Button
                    className="!h-8 !w-auto px-3 !text-[12.5px]"
                    onClick={() => void acceptRequest(r.id)}
                  >
                    {t.accept}
                  </Button>
                }
              />
            ))}
          </ListGroup>
        )}

        <ListGroup caption={t.friendsSection}>
          {friends.length === 0 ? (
            <div className="px-4 py-3 text-[13.5px] text-ink3">
              {t.noFriendsYet}
            </div>
          ) : (
            friends.map((f) => (
              <RowWithAction
                key={f.id}
                title={f.name}
                subtitle={f.username ? `@${f.username}` : undefined}
                onClick={
                  f.username ? () => openWishlist(f.username) : undefined
                }
              />
            ))
          )}
        </ListGroup>

        <ListGroup caption={t.subscribersSection}>
          {subscribers.length === 0 ? (
            <div className="px-4 py-3 text-[13.5px] text-ink3">
              {t.noSubscribersYet}
            </div>
          ) : (
            subscribers.map((s) => (
              <RowWithAction
                key={s.id}
                title={s.name}
                subtitle={s.username ? `@${s.username}` : undefined}
                onClick={
                  s.username ? () => openWishlist(s.username) : undefined
                }
              />
            ))
          )}
        </ListGroup>

        <ListGroup caption={t.language}>
          {LOCALES.map((l) => (
            <ListRow
              key={l}
              label={LOCALE_LABELS[l]}
              selected={l === locale}
              onClick={() => pickLocale(l)}
            />
          ))}
        </ListGroup>
      </div>
      <MainButton
        label={t.shareCta}
        icon={<Icon name="share" size={18} />}
        onClick={() => void share()}
      />
    </div>
  );
}
