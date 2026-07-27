export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[14px] bg-chip p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-w-0 flex-1 truncate rounded-[11px] px-2 py-[8px] text-[13.5px] font-semibold transition-colors ${
            o.value === value
              ? 'bg-accent text-onaccent'
              : 'bg-transparent text-chipink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
