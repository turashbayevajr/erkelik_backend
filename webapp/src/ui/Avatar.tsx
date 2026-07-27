export function Avatar({ name, size = 58 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accentsoft font-bold text-accent"
    >
      {initials}
    </div>
  );
}
