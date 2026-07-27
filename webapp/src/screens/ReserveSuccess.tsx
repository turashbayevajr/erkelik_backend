import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { Confetti, Icon, MainButton } from '../ui';

export function ReserveSuccessScreen({ ownerName }: { ownerName: string }) {
  const { t } = useI18n();
  const nav = useNav();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Confetti />
      <div className="flex flex-1 flex-col items-center justify-center px-11 pb-10 text-center">
        <div className="mb-7 flex h-[118px] w-[118px] animate-[pop-in_0.5s_cubic-bezier(.2,.9,.3,1.3)_both] items-center justify-center rounded-full bg-accent text-onaccent">
          <Icon name="heart" size={56} filled />
        </div>
        <div className="mb-[10px] text-2xl font-bold tracking-tight text-ink">
          {t.reservedTitle}
        </div>
        <div className="max-w-[270px] text-[15px] leading-normal text-ink3">
          {t.reservedText(ownerName)}
        </div>
      </div>
      <MainButton label={t.great} onClick={nav.back} />
    </div>
  );
}
