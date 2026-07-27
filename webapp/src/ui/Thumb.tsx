import { Icon } from './Icon';

// Картинка желания. Нет фото — намеренный плейсхолдер:
// светло-терракотовая заливка + линейная иконка подарка (не «не загрузилось»).
export function Thumb({
  imageUrl,
  size = 64,
  radius = 14,
  className = '',
}: {
  imageUrl?: string;
  size?: number | 'hero';
  radius?: number;
  className?: string;
}) {
  const hero = size === 'hero';
  const style = hero
    ? { height: 210, borderRadius: 20 }
    : { width: size, height: size, borderRadius: radius };

  if (imageUrl) {
    return (
      <div
        className={`shrink-0 overflow-hidden bg-thumb ${hero ? 'w-full' : ''} ${className}`}
        style={style}
      >
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-accentsoft text-accent ${hero ? 'w-full' : ''} ${className}`}
      style={style}
    >
      <Icon
        name="gift"
        size={hero ? 46 : Math.round((Number(size) * 26) / 64)}
        strokeWidth={1.6}
      />
    </div>
  );
}
