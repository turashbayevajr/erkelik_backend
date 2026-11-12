import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { Wish } from '../state/wishes';

/** Пропорция плейсхолдера без фото. */
const PLACEHOLDER_RATIO = 1;

/** Высота / ширина обложки желания — по ней Masonry раскладывает колонки. */
export function pinRatio(wish: Wish): number {
  const cover = wish.images[0];
  return cover ? cover.height / cover.width : PLACEHOLDER_RATIO;
}

function PinCover({ wish }: { wish: Wish }) {
  const cover = wish.images[0];
  if (!cover) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-accentsoft text-accent">
        <Icon name="gift" size={40} strokeWidth={1.5} />
      </div>
    );
  }
  // Пропорции блока = пропорции фото: картинка не режется и не тянется.
  return (
    <div className="relative overflow-hidden rounded-2xl bg-thumb">
      <img
        src={cover.url}
        alt=""
        width={cover.width}
        height={cover.height}
        style={{ aspectRatio: `${cover.width} / ${cover.height}` }}
        className="block h-auto w-full"
        loading="lazy"
        decoding="async"
      />
      {wish.images.length > 1 && (
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-scrim px-[7px] py-[3px] text-[11px] font-semibold text-onscrim tabular-nums">
          <Icon name="image" size={12} strokeWidth={2.2} />
          {wish.images.length}
        </span>
      )}
    </div>
  );
}

// Карточка masonry-сетки: фото целиком, подпись (название, цена) под ним.
// badge — статус в строке цены, footer — экшен-слот дарителя.
export function PinCard({
  wish,
  onClick,
  badge,
  footer,
}: {
  wish: Wish;
  onClick?: () => void;
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <PinCover wish={wish} />
        <div className="px-1 pt-2">
          <div className="text-[14px] leading-[1.25] font-semibold text-ink line-clamp-2 break-words">
            {wish.name}
          </div>
          {(wish.price || badge) && (
            <div className="mt-1 flex min-h-5 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              {wish.price && (
                <span className="text-[14px] font-bold text-ink tabular-nums">
                  {wish.price}
                </span>
              )}
              {badge}
            </div>
          )}
          {!wish.images.length && wish.domain && (
            <div className="mt-1 flex min-w-0 items-center gap-[5px] text-ink3">
              <Icon name="globe" size={12} className="shrink-0" />
              <span className="truncate text-[12px]">{wish.domain}</span>
            </div>
          )}
        </div>
      </button>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
