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
  | 'FORBIDDEN'
  | 'STATUS_CONFLICT'
  | 'RESERVED_OK'
  | 'UNRESERVED_OK'
  | 'ORDERED_OK'
  | 'SELF_RESERVED_OK'
  | 'FULFILLED_OK';

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export function normalizeLocale(x?: unknown): Locale {
  return isLocale(x) ? x : 'EN';
}
