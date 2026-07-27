import { Icon } from './Icon';

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex max-w-full items-center gap-[5px] rounded-full px-3 py-[7px] text-[13px] font-semibold transition-colors ${
        selected ? 'bg-accent text-onaccent' : 'bg-chip text-chipink'
      }`}
    >
      {selected && <Icon name="check" size={13} strokeWidth={2.8} />}
      <span className="truncate">{label}</span>
    </button>
  );
}
