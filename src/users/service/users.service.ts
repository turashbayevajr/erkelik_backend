import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly repo: IUserRepository,
  ) {}

  /** Normalize any incoming locale (query, DTO, etc.) to 'EN' | 'RU' | 'KK'. */
  private pickLocale(pref?: LocaleLike): CommonLocale {
    return normalizeLocale(pref);
  }

  /** Common catch-branch: pass through expected HttpExceptions, wrap the rest into UNEXPECTED and log. */
  private rethrowOrUnexpected(
    err: unknown,
    loc: CommonLocale,
    entityLabel: string,
    context: string,
  ): never {
    // Expected, "written" HTTP exceptions — pass unchanged (no noisy error log)
    if (
      err instanceof NotFoundException ||
      err instanceof ConflictException ||
      err instanceof BadRequestException ||
      err instanceof ForbiddenException
    ) {
      throw err;
    }
    // Any other explicit HttpException (e.g., custom 4xx) — pass through
    if (
      err instanceof HttpException &&
      !(err instanceof InternalServerErrorException)
    ) {
      throw err;
    }

    // Unknown / Internal / driver errors — log and wrap into UNEXPECTED
    this.logger.error(`${context} failed`, (err as any)?.stack);
    throw new InternalServerErrorException(t('UNEXPECTED', loc, entityLabel));
  }

  async create(
    dto: CreateUserDto,
  ): Promise<{ message: string; data: UserModel }> {
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
        preferredLocale: dto.preferredLocale ?? 'EN',
      });

      return { message: t('CREATED_OK', loc, E), data: created };
    } catch (err) {
      this.rethrowOrUnexpected(
        err,
        loc,
        E,
        `create(telegramId=${dto.telegramId})`,
      );
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
        preferredLocale: dto.preferredLocale ?? undefined, // update only if provided
      });

      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, E, `update(id=${id})`);
    }
  }

  async findAll(): Promise<UserModel[]> {
    const loc: CommonLocale = 'EN';
    const E = userEntityLabel(loc);

    try {
      return await this.repo.list();
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, E, 'findAll');
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
      this.rethrowOrUnexpected(err, loc, E, `findOne(id=${id})`);
    }
  }

  async remove(
    id: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string }> {
    const loc = this.pickLocale(responseLocale);
    const E = userEntityLabel(loc);

    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));

      await this.repo.delete(id);
      return { message: t('DELETED_OK', loc, E) };
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, E, `remove(id=${id})`);
    }
  }

  async registerOrUpdateByTelegramId(
    telegramId: bigint,
    username?: string | null,
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: CommonLocale;
    },
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: UserModel }> {
    const loc = this.pickLocale(responseLocale ?? profile?.preferredLocale);
    const E = userEntityLabel(loc);

    try {
      const data = await this.repo.upsertByTelegramId({
        telegramId,
        username: username ?? null,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        preferredLocale: profile?.preferredLocale ?? undefined,
      });

      const isNew = data.createdAt.getTime() === data.updatedAt.getTime();
      return {
        message: isNew ? t('CREATED_OK', loc, E) : t('UPDATED_OK', loc, E),
        data,
      };
    } catch (err) {
      this.rethrowOrUnexpected(
        err,
        loc,
        E,
        `registerOrUpdateByTelegramId(telegramId=${telegramId})`,
      );
    }
  }

  async findByUsername(
    username: string,
    responseLocale?: LocaleLike,
  ): Promise<UserModel> {
    const loc = this.pickLocale(responseLocale);
    const E = userEntityLabel(loc);

    try {
      const user = await this.repo.findByUsername(username);
      if (!user) throw new NotFoundException(t('NOT_FOUND', loc, E));
      return user;
    } catch (err) {
      this.rethrowOrUnexpected(
        err,
        loc,
        E,
        `findByUsername(username=${username})`,
      );
    }
  }

  /** Lightweight helper for bot i18n */
  async getPreferredLocaleByTelegramId(
    telegramId: bigint,
  ): Promise<CommonLocale> {
    const loc: CommonLocale = 'EN';
    const E = userEntityLabel(loc);

    try {
      const user = await this.repo.findByTelegramId(telegramId);
      return user?.preferredLocale ?? 'EN';
    } catch (err) {
      this.rethrowOrUnexpected(
        err,
        loc,
        E,
        `getPreferredLocaleByTelegramId(telegramId=${telegramId})`,
      );
    }
  }

  async updateProfileByTelegramId(
    telegramId: bigint,
    patch: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      preferredLocale?: CommonLocale;
    },
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: UserModel }> {
    const loc = this.pickLocale(responseLocale ?? patch?.preferredLocale);
    const E = userEntityLabel(loc);

    try {
      const updated = await this.repo.updateByTelegramId(telegramId, {
        username: patch.username ?? null,
        firstName: patch.firstName ?? null,
        lastName: patch.lastName ?? null,
        preferredLocale: patch.preferredLocale ?? undefined,
      });
      if (!updated) throw new NotFoundException(t('NOT_FOUND', loc, E));

      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err) {
      this.rethrowOrUnexpected(
        err,
        loc,
        E,
        `updateProfileByTelegramId(telegramId=${telegramId})`,
      );
    }
  }
}
