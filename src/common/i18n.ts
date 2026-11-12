// src/common/i18n.ts
export const LOCALES = ['EN', 'RU', 'KK'] as const;
export type Locale = (typeof LOCALES)[number];

export type MessageKey =
  | 'CREATED_OK'
  | 'UPDATED_OK'
  | 'DELETED_OK'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'UNEXPECTED'
  | 'VALIDATION_FAILED'
  | 'PRICE_TOO_LARGE'
  | 'PHOTO_OR_LINK_REQUIRED'
  | 'IMAGE_INVALID'
  | 'TOO_MANY_IMAGES'
  | 'FORBIDDEN'
  | 'STATUS_CONFLICT'
  | 'RESERVED_OK'
  | 'UNRESERVED_OK'
  | 'ORDERED_OK'
  | 'SELF_RESERVED_OK'
  | 'FULFILLED_OK'
  | 'SUBSCRIBED_OK'
  | 'UNSUBSCRIBED_OK'
  | 'FRIEND_REQUESTED'
  | 'FRIEND_ACCEPTED'
  | 'FRIEND_REMOVED';

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export function normalizeLocale(x?: unknown): Locale {
  return isLocale(x) ? x : 'EN';
}

/** Locale из телеграмного language_code ('ru', 'kk'/'kz', 'en-US'…). */
export function localeFromLanguageCode(
  code?: string | null,
): Locale | undefined {
  const lc = code?.toLowerCase();
  if (!lc) return undefined;
  if (lc.startsWith('ru')) return 'RU';
  if (lc.startsWith('kk') || lc.startsWith('kz')) return 'KK';
  if (lc.startsWith('en')) return 'EN';
  return undefined;
}
