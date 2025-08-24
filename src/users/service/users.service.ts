import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { IUserRepository } from '../repository/users.repository';
import { UserModel } from '../repository/users.model';

import { CreateUserDto } from '../api/dtos/create-user.dto';
import { UpdateUserDto } from '../api/dtos/update-locale.dto';

import { t } from 'src/common/messages';
import { Locale as CommonLocale, normalizeLocale } from 'src/common/i18n';
import type { Locale as PrismaLocale } from '@prisma/client';
import { userEntityLabel } from '../api/dtos/user.i18n';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly repo: IUserRepository) {}

  /** Normalize any incoming locale (query, DTO, etc.) to 'EN' | 'RU' | 'KK'. */
  private pickLocale(pref?: LocaleLike): CommonLocale {
    return normalizeLocale(pref);
  }

  async create(dto: CreateUserDto): Promise<{ message: string; data: UserModel }> {
    const loc = this.pickLocale(dto.preferredLocale);
    const E = userEntityLabel(loc);

    try {
      const exists = await this.repo.findByTelegramId(dto.telegramId);
      if (exists) throw new ConflictException(t('ALREADY_EXISTS', loc, E));

      const created = await this.repo.create({
        telegramId: dto.telegramId,
        username: dto.username ?? null,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        // Persist preferredLocale; default to 'EN'
        preferredLocale: dto.preferredLocale ?? 'EN',
      });

      return { message: t('CREATED_OK', loc, E), data: created };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: UserModel }> {
    const loc = this.pickLocale(responseLocale ?? dto.preferredLocale);
    const E = userEntityLabel(loc);

    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));

      const updated = await this.repo.update(id, {
        username: dto.username ?? null,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        // Allow updating preferredLocale only if provided
        preferredLocale: dto.preferredLocale ?? undefined,
      });

      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async findAll(): Promise<UserModel[]> {
    try {
      return await this.repo.list();
    } catch {
      const loc: CommonLocale = 'EN';
      const E = userEntityLabel(loc);
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async findOne(id: number, responseLocale?: LocaleLike): Promise<UserModel> {
    const loc = this.pickLocale(responseLocale);
    const E = userEntityLabel(loc);

    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
      return found;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async remove(id: number, responseLocale?: LocaleLike): Promise<{ message: string }> {
    const loc = this.pickLocale(responseLocale);
    const E = userEntityLabel(loc);

    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));

      await this.repo.delete(id);
      return { message: t('DELETED_OK', loc, E) };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }
}
