import { Icon } from './Icon';

export function SecrecyBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-[9px] rounded-[14px] bg-accentsoft px-[13px] py-[11px]">
      <Icon
        name="eye-off"
        size={19}
        strokeWidth={1.8}
        className="shrink-0 text-accent"
      />
      <div className="min-w-0 text-[12.5px] leading-[1.35] text-accentsoftink">
        {text}
      </div>
    </div>
  );
}
