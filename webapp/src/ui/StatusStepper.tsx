import { Icon } from './Icon';
import { useI18n } from '../i18n';
import type { WishStatus } from '../state/wishes';

const ORDER: WishStatus[] = ['OPEN', 'RESERVED', 'ORDERED', 'FULFILLED'];

// Прогресс статусов: Открыто → Забронировано → Заказано → Подарено.
export function StatusStepper({ status }: { status: WishStatus }) {
  const { t } = useI18n();
  const labels = [t.statusOpen, t.statusReservedShort, t.statusOrdered, t.statusFulfilled];
  const active = ORDER.indexOf(status);
  const progress = active === 0 ? 0 : (active / (ORDER.length - 1)) * 96;

  return (
    <div className="rounded-2xl bg-surface px-[14px] pt-4 pb-[14px]">
      <div className="relative px-[6px]">
        <div className="absolute top-[10px] right-[26px] left-[26px] h-[2px] bg-thumb" />
        <div
          className="absolute top-[10px] left-[26px] h-[2px] bg-accent"
          style={{ width: `${progress}%`, maxWidth: 'calc(100% - 52px)' }}
        />
        <div className="relative flex justify-between text-center">
          {labels.map((label, i) => (
            <div key={label} className="flex w-14 flex-col items-center gap-[7px]">
              {i < active ? (
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-onaccent">
                  <Icon name="check" size={12} strokeWidth={3.4} />
                </div>
              ) : i === active ? (
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-accent bg-surface">
                  <div className="h-[9px] w-[9px] rounded-full bg-accent" />
                </div>
              ) : (
                <div className="h-[22px] w-[22px] rounded-full bg-thumb" />
              )}
              <div
                className={`text-[10.5px] ${
                  i === active
                    ? 'font-bold text-accent'
                    : i < active
                      ? 'font-semibold text-ink'
                      : 'font-semibold text-ink3'
                }`}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
