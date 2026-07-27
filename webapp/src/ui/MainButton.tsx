import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { getWebApp, isInTelegram } from '../telegram';

// Главное действие экрана. Внутри Telegram — нативный MainButton,
// вне Telegram / в dev — закреплённая внизу кнопка того же вида.
export function MainButton({
  label,
  onClick,
  disabled = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const native = isInTelegram();

  useEffect(() => {
    if (!native) return;
    const mb = getWebApp()!.MainButton;
    mb.setText(label);
    if (disabled) mb.disable();
    else mb.enable();
    mb.onClick(onClick);
    mb.show();
    return () => {
      mb.offClick(onClick);
      mb.hide();
    };
  }, [native, label, onClick, disabled]);

  if (native) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] bg-app px-[10px] pt-2 pb-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-onaccent transition-colors ${
          disabled ? 'pointer-events-none bg-accentdim' : 'bg-accent active:bg-accentpress'
        }`}
      >
        {icon}
        {label}
      </button>
    </div>
  );
}
