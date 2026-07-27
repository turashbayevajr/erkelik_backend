import type { ReactNode } from 'react';

export function Card({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const base = `rounded-[18px] bg-surface p-3 ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left ${base}`}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}
