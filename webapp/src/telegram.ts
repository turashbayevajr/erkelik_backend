// Тонкая обёртка над Telegram Mini App SDK. Единственное место,
// где webapp трогает window.Telegram — компоненты и экраны ходят сюда.

type TgMainButton = {
  setText(text: string): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  setParams(p: { color?: string; text_color?: string }): void;
};

type TgWebApp = {
  initData: string;
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  onEvent(event: string, cb: () => void): void;
  MainButton: TgMainButton;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | undefined {
  return window.Telegram?.WebApp;
}

export function isInTelegram(): boolean {
  return Boolean(getWebApp()?.initData);
}

export function getInitDataRaw(): string {
  const real = getWebApp()?.initData;
  if (real) return real;
  if (import.meta.env.DEV) {
    return sessionStorage.getItem('dev-init-data') ?? '';
  }
  return '';
}

/** language_code пользователя из initData — язык клиента Telegram. */
export function getTelegramLanguageCode(): string | undefined {
  const raw = getInitDataRaw();
  if (!raw) return undefined;
  try {
    const userJson = new URLSearchParams(raw).get('user');
    if (!userJson) return undefined;
    const user = JSON.parse(userJson) as { language_code?: string };
    return user.language_code;
  } catch {
    return undefined;
  }
}

/** start_param из initData: username друга при открытии по share-ссылке. */
export function getStartParam(): string | undefined {
  const raw = getInitDataRaw();
  if (!raw) return undefined;
  try {
    return new URLSearchParams(raw).get('start_param') ?? undefined;
  } catch {
    return undefined;
  }
}

function resolveScheme(): 'light' | 'dark' {
  const tg = getWebApp();
  if (tg?.initData) return tg.colorScheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(): void {
  document.documentElement.dataset.theme = resolveScheme();
}

export function initTelegram(): void {
  applyTheme();
  const tg = getWebApp();
  // SDK-скрипт может быть загружен и вне Telegram (initData пуст) —
  // тогда тему ведёт prefers-color-scheme, а не themeChanged.
  if (!tg?.initData) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', applyTheme);
  }
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.onEvent('themeChanged', applyTheme);
}
