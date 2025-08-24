import { Injectable } from '@nestjs/common';
import { UserModel } from './users.model';
import { Locale } from 'src/common/i18n';
import { PrismaService } from 'src/prisma/prisma.service';

export interface IUserRepository {
  findById(id: number): Promise<UserModel | null>;
  findByTelegramId(telegramId: bigint): Promise<UserModel | null>;
  list(): Promise<UserModel[]>;
  create(data: {
    telegramId: bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
  }): Promise<UserModel>;
  update(id: number, data: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
  }): Promise<UserModel>;
  delete(id: number): Promise<void>;
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
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
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

  async update(id: number, data: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    preferredLocale?: Locale;
  }): Promise<UserModel> {
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
}
