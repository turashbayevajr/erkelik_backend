import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const GAP = 12;

/** 2 колонки на телефоне, 3–5 на широком экране. */
function columnsFor(width: number): number {
  if (width < 600) return 2;
  if (width < 900) return 3;
  if (width < 1200) return 4;
  return 5;
}

// Masonry «как в Pinterest»: колонки одинаковой ширины, каждый элемент
// уходит в самую короткую колонку — порядок читается слева направо, дыр нет.
// Высоту считаем заранее по пропорциям фото (они приходят с бэка), поэтому
// раскладка не прыгает, пока картинки грузятся.
export function Masonry<T>({
  items,
  getKey,
  getRatio,
  renderItem,
  captionHeight = 64,
}: {
  items: T[];
  getKey: (item: T) => string;
  /** Высота / ширина картинки элемента. */
  getRatio: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  /** Примерная высота подписи под фото, px. */
  captionHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => window.innerWidth);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const count = columnsFor(width);
  const columns = useMemo(() => {
    const colWidth = (width - GAP * (count - 1)) / count;
    const cols: T[][] = Array.from({ length: count }, () => []);
    const heights = new Array<number>(count).fill(0);
    for (const item of items) {
      const shortest = heights.indexOf(Math.min(...heights));
      cols[shortest].push(item);
      heights[shortest] += colWidth * getRatio(item) + captionHeight + GAP;
    }
    return cols;
  }, [items, count, width, getRatio, captionHeight]);

  return (
    <div ref={ref} className="flex items-start gap-3">
      {columns.map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {col.map((item) => (
            <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
