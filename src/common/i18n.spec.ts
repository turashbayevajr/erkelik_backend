import { localeFromLanguageCode, normalizeLocale } from './i18n';

describe('localeFromLanguageCode', () => {
  it.each([
    ['ru', 'RU'],
    ['ru-RU', 'RU'],
    ['kk', 'KK'],
    ['kz', 'KK'],
    ['en', 'EN'],
    ['en-US', 'EN'],
    ['KK', 'KK'],
  ] as const)('maps %s to %s', (code, expected) => {
    expect(localeFromLanguageCode(code)).toBe(expected);
  });

  it('returns undefined for unknown, empty and missing codes', () => {
    expect(localeFromLanguageCode('de')).toBeUndefined();
    expect(localeFromLanguageCode('')).toBeUndefined();
    expect(localeFromLanguageCode(undefined)).toBeUndefined();
    expect(localeFromLanguageCode(null)).toBeUndefined();
  });
});

describe('normalizeLocale', () => {
  it('passes valid locales through and falls back to EN', () => {
    expect(normalizeLocale('KK')).toBe('KK');
    expect(normalizeLocale('fr')).toBe('EN');
    expect(normalizeLocale(undefined)).toBe('EN');
  });
});
