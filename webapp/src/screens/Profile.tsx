import { LOCALE_LABELS, useI18n } from '../i18n';
import type { Locale } from '../i18n';
import { useNav } from '../state/nav';
import { useAuth } from '../state/auth';
import { useSocial } from '../state/social';
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
  const {
    friends,
    requests,
    acceptRequest,
    defaultVisibility,
    setDefaultVisibility,
  } = useSocial();

  const displayName = me?.firstName || me?.username || '—';

  const share = () => {
    // Реальная ссылка t.me/... появится вместе с ботовским share-flow.
    void navigator.clipboard?.writeText('https://t.me/erkelik_bot');
  };

  const pickLocale = (l: Locale) => {
    setLocale(l);
    void updateMe({ preferredLocale: l }).catch(() => {});
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
          onClick={share}
        />

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
                subtitle={`@${f.username}`}
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
        onClick={share}
      />
    </div>
  );
}
