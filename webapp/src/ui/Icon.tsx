// Линейные иконки (Lucide-стиль), рисуются currentColor.
// Все SVG-пути в webapp живут здесь и в Logo/EmptyState — не в экранах.

const PATHS: Record<string, string[]> = {
  plus: ['M12 5v14', 'M5 12h14'],
  image: [
    'M3 3h18v18H3z',
    'M9 9m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0',
    'M21 15l-5-5L5 21',
  ],
  gift: [
    'M3 8h18v4H3z',
    'M12 8v13',
    'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7',
    'M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8',
    'M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8',
  ],
  globe: [
    'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0',
    'M2 12h20',
    'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
  ],
  link: [
    'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
    'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  ],
  check: ['M20 6 9 17l-5-5'],
  pencil: [
    'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
    'M15 5l4 4',
  ],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  lock: ['M3 11h18v11H3z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  'credit-card': ['M1 4h22v16H1z', 'M1 10h22'],
  heart: [
    'M12 21s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 4.5C20 16.3 12 21 12 21z',
  ],
  share: [
    'M18 5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M18 19m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M8.6 13.5l6.8 4',
    'M15.4 6.5l-6.8 4',
  ],
  'external-link': [
    'M15 3h6v6',
    'M10 14 21 3',
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  ],
  'eye-off': [
    'M9.88 9.88a3 3 0 1 0 4.24 4.24',
    'M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68',
    'M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61',
    'M2 2l20 20',
  ],
  'gift-open': [
    'M20 12v10H4V12',
    'M2 7h20v5H2z',
    'M12 22V7',
    'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z',
    'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  ],
  user: [
    'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    'M4 21c0-4 3.6-6 8-6s8 2 8 6',
  ],
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  filled = false,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
