import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import { EmptyState, Icon, Logo, MainButton, WishCard } from '../ui';

export function MyWishlistScreen() {
  const { t } = useI18n();
  const nav = useNav();
  const { myWishes } = useWishes();
  const empty = myWishes.length === 0;

  return (
    <div className="flex min-h-dvh flex-col px-[14px] pt-[18px] pb-[84px]">
      <div className="flex items-center justify-between px-1 pb-1">
        <Logo size={22} />
        <div className="flex items-center gap-4 text-ink3">
          <button type="button" onClick={() => nav.push({ name: 'friend' })}>
            <Icon name="gift-open" size={21} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => nav.push({ name: 'profile' })}>
            <Icon name="user" size={21} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {empty ? (
        <EmptyState title={t.emptyTitle} text={t.emptyText} />
      ) : (
        <div className="flex flex-col gap-[11px]">
          <div className="flex items-baseline justify-between px-1 pb-1">
            <div className="text-[26px] font-bold tracking-tight text-ink">
              {t.myWishes}
            </div>
            <div className="text-[13px] font-medium text-ink3 tabular-nums">
              {myWishes.length}
            </div>
          </div>
          {myWishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              onClick={() =>
                nav.push({ name: 'detail', wishId: wish.id, context: 'owner' })
              }
            />
          ))}
        </div>
      )}

      <MainButton
        label={empty ? t.addFirstWish : t.addWish}
        icon={<Icon name="plus" size={19} strokeWidth={2.4} />}
        onClick={() => nav.push({ name: 'add' })}
      />
    </div>
  );
}
