import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { FieldLabel } from './Field';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface ComboOption {
  /** Что подставится в поле при выборе. */
  value: string;
  title: string;
  subtitle?: string;
}

// Поле со списком: можно ввести своё значение или выбрать готовое.
// Список раскрывается шевроном и фильтруется по введённому тексту.
export function Combobox({
  label,
  value,
  onChange,
  onPick,
  options,
  placeholder,
  icon,
  listCaption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: (option: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  icon?: IconName;
  listCaption?: string;
}) {
  const [open, setOpen] = useState(false);

  const query = value.trim().replace(/^@/, '').toLowerCase();
  const matches = query
    ? options.filter(
        (o) =>
          o.value.toLowerCase().includes(query) ||
          o.title.toLowerCase().includes(query),
      )
    : options;
  const listVisible = open && matches.length > 0;

  const pick = (option: ComboOption) => {
    onChange(option.value);
    setOpen(false);
    onPick?.(option);
  };

  return (
    <div>
      <FieldLabel text={label} />
      <div className="flex items-center gap-2 rounded-[14px] bg-surface px-[14px]">
        {icon && <Icon name={icon} size={15} className="shrink-0 text-ink3" />}
        <input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent py-[13px] text-[15px] text-ink outline-none placeholder:text-ink3"
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-ink3"
          >
            <Icon
              name="chevron-down"
              size={18}
              strokeWidth={2.2}
              className={listVisible ? 'rotate-180' : undefined}
            />
          </button>
        )}
      </div>

      {listVisible && (
        <div className="mt-2">
          {listCaption && (
            <div className="mx-[6px] mb-2 font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
              {listCaption}
            </div>
          )}
          <div className="max-h-[240px] divide-y divide-linesoft overflow-y-auto rounded-2xl bg-surface">
            {matches.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-ink">
                    {option.title}
                  </div>
                  {option.subtitle && (
                    <div className="mt-px truncate text-[12.5px] text-ink3">
                      {option.subtitle}
                    </div>
                  )}
                </div>
                <Icon
                  name="chevron-right"
                  size={18}
                  className="shrink-0 text-ink3"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
