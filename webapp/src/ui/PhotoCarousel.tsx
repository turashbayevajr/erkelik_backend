import { useState } from 'react';
import type { UIEvent } from 'react';
import { Thumb } from './Thumb';
import type { WishPhoto } from '../state/wishes';

// Высота карусели — по пропорциям первого фото, но в разумных пределах
// (от 4:3 альбомной до 4:5 портретной). Остальные фото вписываются целиком.
const MIN_RATIO = 3 / 4;
const MAX_RATIO = 5 / 4;

// Листаемые фото желания: свайп со snap-прокруткой и точки-индикатор.
export function PhotoCarousel({
  photos,
  label,
}: {
  photos: WishPhoto[];
  /** aria-подпись слайда: (номер, всего) → «Фото 2 из 5». */
  label: (n: number, total: number) => string;
}) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return <Thumb size="hero" />;

  const first = photos[0];
  const ratio = Math.min(
    MAX_RATIO,
    Math.max(MIN_RATIO, first.height / first.width),
  );

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="flex flex-col items-center gap-[10px]">
      <div
        onScroll={onScroll}
        style={{ aspectRatio: `1 / ${ratio}` }}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[20px] bg-thumb [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div
            key={photo.key}
            aria-label={label(i + 1, photos.length)}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center"
          >
            <img
              src={photo.url}
              alt=""
              className="h-full w-full object-contain"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-[6px]">
          {photos.map((photo, i) => (
            <span
              key={photo.key}
              className={`h-[6px] rounded-full transition-all ${i === index ? 'w-4 bg-accent' : 'w-[6px] bg-accentdim'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
