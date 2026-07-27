import { createHmac, timingSafeEqual } from 'crypto';

// Проверка Telegram Mini App initData по официальному алгоритму:
// secret = HMAC_SHA256(key="WebAppData", BOT_TOKEN); из initData выкидывается
// hash, остальные пары сортируются и склеиваются через \n. Любая ошибка —
// null, guard переводит его в одинаковый 401 без деталей.

export const MAX_INIT_DATA_AGE_SEC = 24 * 60 * 60;

export interface InitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: InitDataUser;
  authDate: number;
  startParam?: string;
}

function secretKey(botToken: string): Buffer {
  return createHmac('sha256', 'WebAppData').update(botToken).digest();
}

function dataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`);
  });
  return pairs.sort().join('\n');
}

function computeHash(params: URLSearchParams, botToken: string): string {
  return createHmac('sha256', secretKey(botToken))
    .update(dataCheckString(params))
    .digest('hex');
}

export function verifyInitData(
  raw: string,
  botToken: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): VerifiedInitData | null {
  if (!raw || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash) return null;

  const expected = Buffer.from(computeHash(params, botToken), 'hex');
  let actual: Buffer;
  try {
    actual = Buffer.from(hash, 'hex');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  if (nowSec - authDate > MAX_INIT_DATA_AGE_SEC) return null;

  const rawUser = params.get('user');
  if (!rawUser) return null;
  let user: unknown;
  try {
    user = JSON.parse(rawUser);
  } catch {
    return null;
  }
  if (
    typeof user !== 'object' ||
    user === null ||
    typeof (user as InitDataUser).id !== 'number'
  ) {
    return null;
  }

  return {
    user: user as InitDataUser,
    authDate,
    startParam: params.get('start_param') ?? undefined,
  };
}

/**
 * Подписывает initData тем же алгоритмом, что и Telegram — для тестов
 * и npm run dev:init-data. В проде не используется.
 */
export function signInitData(
  data: {
    user: InitDataUser;
    authDate?: number;
    startParam?: string;
  },
  botToken: string,
): string {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(data.user));
  params.set(
    'auth_date',
    String(data.authDate ?? Math.floor(Date.now() / 1000)),
  );
  if (data.startParam) params.set('start_param', data.startParam);
  params.set('hash', computeHash(params, botToken));
  return params.toString();
}
