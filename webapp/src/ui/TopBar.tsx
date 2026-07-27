import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useI18n } from '../i18n';

// Шапка под-экрана: назад + заголовок. В Telegram кнопку «назад» даёт
// нативный BackButton, но in-page вариант нужен вне Telegram и в dev.
export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="sticky top-0 z-10 flex h-[50px] flex-none items-center justify-between border-b border-line bg-surface px-2">
      <div className="flex w-[86px] justify-start">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center text-accent"
          >
            <Icon name="chevron-left" size={24} strokeWidth={2.2} />
            <span className="text-[16px] font-medium">{t.back}</span>
          </button>
        )}
      </div>
      <div className="min-w-0 truncate text-[15px] font-semibold text-ink">
        {title}
      </div>
      <div className="flex w-[86px] justify-end pr-2">{right}</div>
    </div>
  );
}
