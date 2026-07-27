import type { ChangeEvent } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mx-1 mb-[6px] text-[13px] font-semibold text-ink2">
      {text}
      {hint && <span className="font-medium text-ink3"> · {hint}</span>}
    </div>
  );
}

export function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  icon,
  inputMode,
  type = 'text',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: IconName;
  inputMode?: 'text' | 'decimal' | 'url';
  type?: 'text' | 'password';
}) {
  return (
    <div>
      <Label text={label} hint={hint} />
      <div className="flex items-center gap-2 rounded-[14px] bg-surface px-[14px]">
        {icon && <Icon name={icon} size={15} className="shrink-0 text-ink3" />}
        <input
          value={value}
          type={type}
          inputMode={inputMode}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent py-[13px] text-[15px] text-ink outline-none placeholder:text-ink3"
        />
      </div>
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label text={label} />
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        rows={3}
        className="min-h-16 w-full resize-none rounded-[14px] bg-surface px-[14px] py-[13px] text-[15px] leading-[1.45] text-ink outline-none placeholder:text-ink3"
      />
    </div>
  );
}
