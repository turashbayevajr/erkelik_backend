import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { signInitData } from 'src/common/init-data';
import { ApiAuthGuard } from './api-auth.guard';
import type { UserService } from 'src/users/service/users.service';

const BOT_TOKEN = '12345:test-token';

function contextFor(authorization?: string): ExecutionContext {
  const req = { headers: { authorization }, user: undefined };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => function handler() {},
    getClass: () => class Ctrl {},
  } as unknown as ExecutionContext;
}

describe('ApiAuthGuard (tma)', () => {
  const me = { id: 1, telegramId: 777n, preferredLocale: 'EN' };
  let registerOrUpdateByTelegramId: jest.Mock;
  let guard: ApiAuthGuard;

  beforeEach(() => {
    process.env.BOT_TOKEN = BOT_TOKEN;
    registerOrUpdateByTelegramId = jest
      .fn()
      .mockResolvedValue({ message: 'ok', data: me });
    const users = {
      registerOrUpdateByTelegramId,
      findByTelegramId: jest.fn(),
    } as unknown as UserService;
    guard = new ApiAuthGuard(users, new Reflector());
  });

  it('creates the user with initial locale from language_code', async () => {
    const raw = signInitData(
      {
        user: { id: 777, first_name: 'Aigerim', language_code: 'kk' },
      },
      BOT_TOKEN,
    );
    await expect(guard.canActivate(contextFor(`tma ${raw}`))).resolves.toBe(
      true,
    );
    expect(registerOrUpdateByTelegramId).toHaveBeenCalledWith(
      777n,
      undefined,
      expect.objectContaining({ initialPreferredLocale: 'KK' }),
    );
    // именно initial-, а не preferredLocale: выбор в базе не перетирается
    const profile = registerOrUpdateByTelegramId.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(profile.preferredLocale).toBeUndefined();
  });

  it('passes no initial locale for unknown language_code', async () => {
    const raw = signInitData(
      { user: { id: 777, first_name: 'Aigerim', language_code: 'de' } },
      BOT_TOKEN,
    );
    await guard.canActivate(contextFor(`tma ${raw}`));
    expect(registerOrUpdateByTelegramId).toHaveBeenCalledWith(
      777n,
      undefined,
      expect.objectContaining({ initialPreferredLocale: undefined }),
    );
  });

  it('rejects a broken signature with 401', async () => {
    const raw = signInitData(
      { user: { id: 777, first_name: 'Aigerim' } },
      'other:token',
    );
    await expect(guard.canActivate(contextFor(`tma ${raw}`))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(registerOrUpdateByTelegramId).not.toHaveBeenCalled();
  });
});
