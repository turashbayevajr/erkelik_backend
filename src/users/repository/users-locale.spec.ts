import { UserRepository } from './users.repository';
import type { PrismaService } from 'src/prisma/prisma.service';

const row = (over: Record<string, unknown>) => ({
  id: 1,
  telegramId: 10n,
  username: 'u',
  firstName: null,
  lastName: null,
  preferredLocale: 'EN',
  localeChosen: false,
  defaultVisibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('UserRepository locale', () => {
  let prisma: { user: { upsert: jest.Mock; update: jest.Mock } };
  let repo: UserRepository;

  beforeEach(() => {
    prisma = { user: { upsert: jest.fn(), update: jest.fn() } };
    prisma.user.update.mockImplementation(({ data }) =>
      Promise.resolve(row(data as Record<string, unknown>)),
    );
    repo = new UserRepository(prisma as unknown as PrismaService);
  });

  it('a new user gets the Telegram client language', async () => {
    prisma.user.upsert.mockResolvedValue(row({ preferredLocale: 'RU' }));
    await repo.upsertByTelegramId({ telegramId: 10n, clientLocale: 'RU' });
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ preferredLocale: 'RU' }) as unknown,
      }),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  // Старые пользователи остались с дефолтным EN, а видят русский клиент —
  // уведомления уходили на английском.
  it('follows the Telegram language while the user has not chosen one', async () => {
    prisma.user.upsert.mockResolvedValue(row({ preferredLocale: 'EN' }));
    const user = await repo.upsertByTelegramId({
      telegramId: 10n,
      clientLocale: 'RU',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { preferredLocale: 'RU' },
    });
    expect(user.preferredLocale).toBe('RU');
  });

  it('keeps an explicitly chosen language', async () => {
    prisma.user.upsert.mockResolvedValue(
      row({ preferredLocale: 'EN', localeChosen: true }),
    );
    const user = await repo.upsertByTelegramId({
      telegramId: 10n,
      clientLocale: 'RU',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(user.preferredLocale).toBe('EN');
  });

  it('does nothing when the client language is unknown', async () => {
    prisma.user.upsert.mockResolvedValue(row({ preferredLocale: 'KK' }));
    await repo.upsertByTelegramId({ telegramId: 10n });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('choosing a language in the profile marks it as chosen', async () => {
    await repo.updateByTelegramId(10n, { preferredLocale: 'KK' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferredLocale: 'KK',
          localeChosen: true,
        }) as unknown,
      }),
    );
  });

  it('other profile changes do not mark the language as chosen', async () => {
    await repo.updateByTelegramId(10n, { defaultVisibility: 'FRIENDS' });
    const [[arg]] = prisma.user.update.mock.calls as [[{ data: object }]];
    expect(arg.data).not.toHaveProperty('localeChosen');
  });
});
