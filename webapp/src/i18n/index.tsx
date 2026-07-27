import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ru } from './ru';
import type { Dict } from './ru';
import { kk } from './kk';
import { en } from './en';

export type Locale = 'RU' | 'KK' | 'EN';

const DICTS: Record<Locale, Dict> = { RU: ru, KK: kk, EN: en };

export const LOCALE_LABELS: Record<Locale, string> = {
  RU: 'Русский',
  KK: 'Қазақша',
  EN: 'English',
};

function detectLocale(): Locale {
  const saved = localStorage.getItem('locale');
  if (saved === 'RU' || saved === 'KK' || saved === 'EN') return saved;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ru')) return 'RU';
  if (lang.startsWith('kk') || lang.startsWith('kz')) return 'KK';
  return 'EN';
}

type I18n = { t: Dict; locale: Locale; setLocale: (l: Locale) => void };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const value = useMemo<I18n>(
    () => ({
      t: DICTS[locale],
      locale,
      setLocale: (l) => {
        localStorage.setItem('locale', l);
        setLocaleState(l);
      },
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
