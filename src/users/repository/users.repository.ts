import { Locale } from 'src/common/i18n';
import type { WishVisibility } from '@prisma/client';
import { UserModel } from './users.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface IUserRepository {
  findById(id: number): Promise<UserModel | null>;
  findByTelegramId(telegramId: bigint): Promise<UserModel | null>;
  findByUsername(username: string): Promise<UserModel | null>;
  findAuthByLogin(
    login: string,
  ): Promise<{ user: UserModel; passwordHash: string | null } | null>;

  list(): Promise<UserModel[]>;

  create(data: {
    telegramId: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
  }): Promise<UserModel>;

  update(
    id: number,
    data: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: Locale;
    },
  ): Promise<UserModel>;

  delete(id: number): Promise<void>;

  upsertByTelegramId(data: {
    telegramId: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
    /** Язык клиента: при create и пока язык не выбран явно (localeChosen). */
    clientLocale?: Locale;
  }): Promise<UserModel>;

  updateByTelegramId(
    telegramId: bigint,
    data: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: Locale;
      defaultVisibility?: WishVisibility;
    },
  ): Promise<UserModel | null>;
}
function map(entity: any): UserModel {
  return {
    id: entity.id,
    telegramId: BigInt(entity.telegramId),
    username: entity.username,
    firstName: entity.firstName,
    lastName: entity.lastName,
    preferredLocale: entity.preferredLocale as Locale,
    defaultVisibility: entity.defaultVisibility as WishVisibility,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<UserModel | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? map(user) : null;
  }

  async findByTelegramId(telegramId: bigint): Promise<UserModel | null> {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    return user ? map(user) : null;
  }

  // NEW: case-insensitive username lookup
  async findByUsername(username: string): Promise<UserModel | null> {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) return null;
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: trimmed, mode: 'insensitive' } },
    });
    return user ? map(user) : null;
  }

  // Для /api/auth/login: модель + хэш пароля одним запросом.
  async findAuthByLogin(
    login: string,
  ): Promise<{ user: UserModel; passwordHash: string | null } | null> {
    const trimmed = login.trim();
    if (!trimmed) return null;
    const row = await this.prisma.user.findUnique({
      where: { login: trimmed },
    });
    return row ? { user: map(row), passwordHash: row.passwordHash } : null;
  }

  async list(): Promise<UserModel[]> {
    const rows = await this.prisma.user.findMany({ orderBy: { id: 'desc' } });
    return rows.map(map);
  }

  async create(data: {
    telegramId: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
  }): Promise<UserModel> {
    const created = await this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        preferredLocale: data.preferredLocale ?? 'EN',
      },
    });
    return map(created);
  }

  async update(
    id: number,
    data: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: Locale;
    },
  ): Promise<UserModel> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        username: data.username ?? undefined,
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        preferredLocale: data.preferredLocale ?? undefined,
        ...(data.preferredLocale ? { localeChosen: true } : {}),
      },
    });
    return map(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  // NEW: idempotent register-or-update by telegramId
  async upsertByTelegramId(data: {
    telegramId: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
    clientLocale?: Locale;
  }): Promise<UserModel> {
    const up = await this.prisma.user.upsert({
      where: { telegramId: data.telegramId },
      create: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        preferredLocale: data.preferredLocale ?? data.clientLocale ?? 'EN',
      },
      update: {
        // Telegram profile may change; update only when provided
        username: data.username ?? undefined,
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        preferredLocale: data.preferredLocale ?? undefined,
        ...(data.preferredLocale ? { localeChosen: true } : {}),
      },
    });
    // Пока язык не выбран явно, он следует за языком клиента Telegram:
    // иначе уведомления уходят на дефолтном EN, хотя человек видит русский.
    if (
      !up.localeChosen &&
      data.clientLocale &&
      up.preferredLocale !== data.clientLocale
    ) {
      const synced = await this.prisma.user.update({
        where: { id: up.id },
        data: { preferredLocale: data.clientLocale },
      });
      return map(synced);
    }
    return map(up);
  }

  // NEW: update by telegramId; returns null if user not found
  async updateByTelegramId(
    telegramId: bigint,
    data: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: Locale;
      defaultVisibility?: WishVisibility;
    },
  ): Promise<UserModel | null> {
    try {
      const updated = await this.prisma.user.update({
        where: { telegramId },
        data: {
          username: data.username ?? undefined,
          firstName: data.firstName ?? undefined,
          lastName: data.lastName ?? undefined,
          preferredLocale: data.preferredLocale ?? undefined,
          // явный выбор языка — больше не следуем за языком Telegram
          ...(data.preferredLocale ? { localeChosen: true } : {}),
          defaultVisibility: data.defaultVisibility ?? undefined,
        },
      });
      return map(updated);
    } catch (e: any) {
      if (e?.code === 'P2025') return null; // not found
      throw e;
    }
  }
}
