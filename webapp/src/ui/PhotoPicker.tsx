import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Skeleton';
import { FieldLabel } from './Field';

export interface PickerPhoto {
  /** Локальный id плитки (до загрузки ключа ещё нет). */
  id: string;
  /** Превью: object URL до загрузки, адрес с сервера после. */
  url: string;
  status: 'uploading' | 'done' | 'error';
}

// Фото в форме желания: плитки с превью, «+» открывает системный выбор
// (можно несколько сразу). Первое фото — обложка карточки в сетке.
export function PhotoPicker({
  label,
  hint,
  coverLabel,
  addLabel,
  removeLabel,
  photos,
  max,
  onAdd,
  onRemove,
}: {
  label: string;
  hint?: string;
  coverLabel: string;
  addLabel: string;
  removeLabel: string;
  photos: PickerPhoto[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // повторный выбор того же файла тоже сработает
    if (files.length) onAdd(files);
  };

  return (
    <div>
      <FieldLabel text={label} hint={hint} />
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-[12px] bg-thumb"
          >
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
            {photo.status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-scrim">
                <Spinner size={18} />
              </div>
            )}
            {photo.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-scrim text-onscrim">
                <Icon name="x" size={22} strokeWidth={2.4} />
              </div>
            )}
            {i === 0 && photo.status === 'done' && (
              <span className="absolute bottom-1 left-1 rounded-full bg-scrim px-[6px] py-[1px] text-[10px] font-semibold text-onscrim">
                {coverLabel}
              </span>
            )}
            <button
              type="button"
              aria-label={removeLabel}
              onClick={() => onRemove(photo.id)}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-scrim text-onscrim"
            >
              <Icon name="x" size={13} strokeWidth={2.6} />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-accentborder bg-accentwash text-accent"
          >
            <Icon name="plus" size={20} strokeWidth={2.2} />
            <span className="px-1 text-center text-[11px] leading-tight font-semibold">
              {addLabel}
            </span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={pick}
      />
    </div>
  );
}
