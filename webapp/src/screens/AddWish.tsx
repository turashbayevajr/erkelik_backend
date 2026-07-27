import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useNav } from '../state/nav';
import { useWishes } from '../state/wishes';
import type { WishVisibility } from '../state/wishes';
import { useSocial } from '../state/social';
import {
  Card,
  Chip,
  Field,
  Icon,
  MainButton,
  Segmented,
  Shimmer,
  Spinner,
  TextArea,
  Thumb,
  TopBar,
} from '../ui';

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; title: string; domain: string; imageUrl?: string }
  | { kind: 'missing' };

function parseDomain(raw: string): string | null {
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.includes('.') ? url.hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

// Мок автопревью: бэкендовый OG-эндпоинт подключится сюда же.
function fetchPreviewMock(domain: string): Promise<PreviewState> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          domain.includes('nopreview')
            ? { kind: 'missing' }
            : { kind: 'found', title: `Keychron K8 Pro`, domain },
        ),
      1400,
    ),
  );
}

function PreviewCard({ state }: { state: PreviewState }) {
  const { t } = useI18n();
  if (state.kind === 'idle') return null;

  if (state.kind === 'loading') {
    return (
      <Card className="flex items-center gap-[10px] rounded-[14px] !p-[10px]">
        <Shimmer className="h-14 w-14 shrink-0 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Shimmer className="h-3 w-[82%]" />
          <Shimmer className="h-3 w-[46%]" />
        </div>
        <div className="flex shrink-0 items-center gap-[6px] text-[12px] text-ink3">
          <Spinner />
          {t.previewSearching}
        </div>
      </Card>
    );
  }

  if (state.kind === 'missing') {
    return (
      <div className="flex items-center gap-[10px] rounded-xl border border-dashed border-accentborder bg-accentwash p-3">
        <Icon name="gift" size={22} strokeWidth={1.8} className="shrink-0 text-accent" />
        <div className="min-w-0 text-[13px] leading-[1.4] text-accentsoftink">
          {t.previewNotFound}
        </div>
      </div>
    );
  }

  return (
    <Card className="flex items-center gap-[10px] rounded-[14px] !p-[10px]">
      <Thumb imageUrl={state.imageUrl} size={56} radius={10} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">
          {state.title}
        </div>
        <div className="mt-[2px] truncate text-[13px] text-ink3">{state.domain}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent">
        <Icon name="check" size={14} strokeWidth={2.6} />
        {t.previewFromLink}
      </div>
    </Card>
  );
}

export function AddWishScreen() {
  const { t } = useI18n();
  const nav = useNav();
  const { addWish } = useWishes();
  const { friends, defaultVisibility } = useSocial();

  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] =
    useState<WishVisibility>(defaultVisibility);
  const [allowed, setAllowed] = useState<number[]>([]);
  const [preview, setPreview] = useState<PreviewState>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const requestRef = useRef(0);

  const toggleAllowed = (id: number) =>
    setAllowed((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );

  useEffect(() => {
    const domain = parseDomain(link.trim());
    if (!domain) {
      setPreview({ kind: 'idle' });
      return;
    }
    const request = ++requestRef.current;
    setPreview({ kind: 'loading' });
    const timer = setTimeout(() => {
      void fetchPreviewMock(domain).then((result) => {
        if (requestRef.current !== request) return;
        setPreview(result);
        if (result.kind === 'found') {
          setName((v) => v || result.title);
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [link]);

  const canSave =
    name.trim().length > 0 && (visibility !== 'CUSTOM' || allowed.length > 0);

  const save = () => {
    const domain = parseDomain(link.trim()) ?? undefined;
    setSaving(true);
    void addWish({
      name: name.trim(),
      price: price.trim() || undefined,
      url: link.trim() || undefined,
      domain,
      description: description.trim() || undefined,
      imageUrl: preview.kind === 'found' ? preview.imageUrl : undefined,
      visibility,
      allowedUserIds: visibility === 'CUSTOM' ? allowed : undefined,
    })
      .then(() => nav.back())
      .catch(() => setSaving(false));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.newWish} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-[18px] pb-[84px]">
        <Field
          label={t.linkLabel}
          value={link}
          onChange={setLink}
          placeholder={t.linkPlaceholder}
          icon="link"
          inputMode="url"
        />
        <PreviewCard state={preview} />
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
      </div>
      <MainButton label={t.saveWish} onClick={save} disabled={!canSave || saving} />
    </div>
  );
}
