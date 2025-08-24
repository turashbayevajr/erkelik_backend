import { Locale } from 'src/common/i18n';
import { UserModel } from './users.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface IUserRepository {
  findById(id: number): Promise<UserModel | null>;
  findByTelegramId(telegramId: bigint): Promise<UserModel | null>;
  findByUsername(username: string): Promise<UserModel | null>;

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
  }): Promise<UserModel>;

  updateByTelegramId(
    telegramId: bigint,
    data: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: Locale;
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
  }): Promise<UserModel> {
    const up = await this.prisma.user.upsert({
      where: { telegramId: data.telegramId },
      create: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        preferredLocale: data.preferredLocale ?? 'EN',
      },
      update: {
        // Telegram profile may change; update only when provided
        username: data.username ?? undefined,
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        preferredLocale: data.preferredLocale ?? undefined,
      },
    });
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
        },
      });
      return map(updated);
    } catch (e: any) {
      if (e?.code === 'P2025') return null; // not found
      throw e;
    }
  }
}
