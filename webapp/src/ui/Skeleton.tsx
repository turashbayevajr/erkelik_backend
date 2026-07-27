// Шиммер-заготовки загрузки (включая скелетон превью в форме добавления).
export function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-[shimmer_1.3s_infinite_linear] rounded-md bg-[linear-gradient(90deg,var(--thumb)_25%,var(--line-soft)_37%,var(--thumb)_63%)] bg-[length:640px_100%] ${className}`}
    />
  );
}

export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-block animate-[spin_0.9s_linear_infinite] rounded-full border-2 border-line border-t-accent"
    />
  );
}
