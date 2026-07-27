import {
  MAX_INIT_DATA_AGE_SEC,
  signInitData,
  verifyInitData,
} from './init-data';

const BOT_TOKEN = '12345:test-token';
const NOW = 1_800_000_000;

const user = {
  id: 777,
  first_name: 'Aigerim',
  username: 'aigerim',
  language_code: 'kk',
};

describe('verifyInitData', () => {
  it('accepts initData signed with the same bot token', () => {
    const raw = signInitData({ user, authDate: NOW - 60 }, BOT_TOKEN);
    const verified = verifyInitData(raw, BOT_TOKEN, NOW);
    expect(verified).not.toBeNull();
    expect(verified?.user.id).toBe(777);
    expect(verified?.user.username).toBe('aigerim');
    expect(verified?.authDate).toBe(NOW - 60);
  });

  it('passes start_param through', () => {
    const raw = signInitData(
      { user, authDate: NOW - 60, startParam: 'aigerim' },
      BOT_TOKEN,
    );
    expect(verifyInitData(raw, BOT_TOKEN, NOW)?.startParam).toBe('aigerim');
  });

  it('rejects initData signed with another bot token', () => {
    const raw = signInitData({ user, authDate: NOW - 60 }, 'other:token');
    expect(verifyInitData(raw, BOT_TOKEN, NOW)).toBeNull();
  });

  it('rejects tampered payload', () => {
    const raw = signInitData({ user, authDate: NOW - 60 }, BOT_TOKEN);
    const params = new URLSearchParams(raw);
    params.set('user', JSON.stringify({ ...user, id: 999 }));
    expect(verifyInitData(params.toString(), BOT_TOKEN, NOW)).toBeNull();
  });

  it('rejects expired auth_date', () => {
    const raw = signInitData(
      { user, authDate: NOW - MAX_INIT_DATA_AGE_SEC - 1 },
      BOT_TOKEN,
    );
    expect(verifyInitData(raw, BOT_TOKEN, NOW)).toBeNull();
  });

  it('accepts auth_date on the age boundary', () => {
    const raw = signInitData(
      { user, authDate: NOW - MAX_INIT_DATA_AGE_SEC },
      BOT_TOKEN,
    );
    expect(verifyInitData(raw, BOT_TOKEN, NOW)).not.toBeNull();
  });

  it('rejects missing hash, empty input and missing user', () => {
    expect(verifyInitData('', BOT_TOKEN, NOW)).toBeNull();
    expect(
      verifyInitData('auth_date=1&user=%7B%7D', BOT_TOKEN, NOW),
    ).toBeNull();

    const noUser = new URLSearchParams();
    noUser.set('auth_date', String(NOW));
    const signed = signInitData({ user, authDate: NOW }, BOT_TOKEN);
    const hash = new URLSearchParams(signed).get('hash')!;
    noUser.set('hash', hash);
    expect(verifyInitData(noUser.toString(), BOT_TOKEN, NOW)).toBeNull();
  });
});
