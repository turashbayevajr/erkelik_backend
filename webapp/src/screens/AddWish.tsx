import { useRef, useState } from 'react';
import { uploadImage } from '../api';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import type { WishVisibility } from '../state/wishes';
import type { PickerPhoto } from '../ui';

/** Совпадает с лимитом бэкенда (MAX_WISH_IMAGES). */
const MAX_PHOTOS = 8;

type LocalPhoto = PickerPhoto & { key?: string };

import { useSocial } from '../state/social';
import {
  Chip,
  Field,
  MainButton,
  PhotoPicker,
  Segmented,
  TextArea,
  TopBar,
} from '../ui';

function parseDomain(raw: string): string | null {
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.includes('.') ? url.hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

// editId превращает экран в редактирование: поля предзаполняются, сохранение
// идёт через PATCH. Для CUSTOM-желания текущий список доступа с бэка не
// приходит — пустой выбор при сохранении означает «не менять доступ».
export function AddWishScreen({ editId }: { editId?: string }) {
  const { t } = useI18n();
  const nav = useNav();
  const { addWish, updateWish, find } = useWishes();
  const { friends, defaultVisibility } = useSocial();
  const editing = editId ? find(editId) : undefined;

  const [link, setLink] = useState(editing?.url ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [price, setPrice] = useState(editing?.price ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [visibility, setVisibility] = useState<WishVisibility>(
    editing?.visibility ?? defaultVisibility,
  );
  const [allowed, setAllowed] = useState<number[]>([]);
  const [photos, setPhotos] = useState<LocalPhoto[]>(
    () =>
      editing?.images.map((im) => ({
        id: im.key,
        key: im.key,
        url: im.url,
        status: 'done' as const,
      })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const photoSeq = useRef(0);

  // Фото грузятся сразу после выбора: к сохранению желания ключи уже есть.
  const addPhotos = (files: File[]) => {
    const room = MAX_PHOTOS - photos.length;
    const added = files.slice(0, Math.max(0, room)).map((file) => ({
      file,
      photo: {
        id: `local-${++photoSeq.current}`,
        url: URL.createObjectURL(file),
        status: 'uploading' as const,
      },
    }));
    setPhotos((list) => [...list, ...added.map((a) => a.photo)]);
    for (const { file, photo } of added) {
      void uploadImage(file)
        .then((image) =>
          setPhotos((list) =>
            list.map((p) =>
              p.id === photo.id ? { ...p, key: image.key, status: 'done' } : p,
            ),
          ),
        )
        .catch(() =>
          setPhotos((list) =>
            list.map((p) => (p.id === photo.id ? { ...p, status: 'error' } : p)),
          ),
        );
    }
  };
  const removePhoto = (id: string) =>
    setPhotos((list) => list.filter((p) => p.id !== id));

  const photoKeys = photos.flatMap((p) =>
    p.status === 'done' && p.key ? [p.key] : [],
  );
  const uploading = photos.some((p) => p.status === 'uploading');
  const hasPhotoOrLink = link.trim().length > 0 || photoKeys.length > 0;

  const toggleAllowed = (id: number) =>
    setAllowed((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );


  const canSave =
    name.trim().length > 0 &&
    hasPhotoOrLink &&
    !uploading &&
    (visibility !== 'CUSTOM' || allowed.length > 0 || Boolean(editId));

  const save = () => {
    const domain = parseDomain(link.trim()) ?? undefined;
    setSaving(true);
    setSaveError(false);
    const payload = {
      name: name.trim(),
      price: price.trim() || undefined,
      url: link.trim() || undefined,
      domain,
      description: description.trim() || undefined,
      imageKeys: photoKeys,
      visibility,
      // при редактировании пустой выбор = оставить текущий список доступа
      allowedUserIds:
        visibility === 'CUSTOM' && allowed.length > 0 ? allowed : undefined,
    };
    void (editId ? updateWish(editId, payload) : addWish(payload))
      .then(() => nav.back())
      .catch(() => {
        setSaving(false);
        setSaveError(true);
      });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={editId ? t.editWish : t.newWish} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-[18px] pb-[84px]">
        <PhotoPicker
          label={t.photosLabel}
          hint={t.photosHint}
          coverLabel={t.cover}
          addLabel={t.addPhoto}
          removeLabel={t.removePhoto}
          photos={photos}
          max={MAX_PHOTOS}
          onAdd={addPhotos}
          onRemove={removePhoto}
        />
        <Field
          label={t.linkLabel}
          value={link}
          onChange={setLink}
          placeholder={t.linkPlaceholder}
          icon="link"
          inputMode="url"
        />
        {!hasPhotoOrLink && (
          <div className="px-1 text-[13px] leading-[1.4] text-ink3">
            {t.photoOrLinkHint}
          </div>
        )}
        <Field
          label={t.nameLabel}
          value={name}
          onChange={setName}
          placeholder={t.namePlaceholder}
        />
        <Field
          label={t.priceLabel}
          hint={t.optional}
          value={price}
          onChange={setPrice}
          placeholder={t.pricePlaceholder}
          inputMode="decimal"
        />
        <TextArea
          label={t.descriptionLabel}
          value={description}
          onChange={setDescription}
          placeholder={t.descriptionPlaceholder}
        />
        <div>
          <div className="mx-1 mb-[6px] text-[13px] font-semibold text-ink2">
            {t.visibilityLabel}
          </div>
          <Segmented
            options={[
              { value: 'PUBLIC', label: t.visPublic },
              { value: 'FRIENDS', label: t.visFriends },
              { value: 'CUSTOM', label: t.visCustom },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
          {visibility === 'CUSTOM' && (
            <div className="mt-3">
              <div className="mx-1 mb-2 text-[12.5px] text-ink3">
                {t.visCustomHint}
              </div>
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.name}
                    selected={allowed.includes(f.id)}
                    onClick={() => toggleAllowed(f.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {saveError && (
          <div className="px-1 text-[13px] text-accent">{t.saveFailed}</div>
        )}
      </div>
      <MainButton label={t.saveWish} onClick={save} disabled={!canSave || saving} />
    </div>
  );
}
