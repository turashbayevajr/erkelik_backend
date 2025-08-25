import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Locale as PrismaLocale, WishlistStatus } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { normalizeLocale } from 'src/common/i18n';
import { t } from 'src/common/messages';
import {
  IWishlistRepository,
  ListOptions,
} from '../repository/wishlist.repository';
import { WishlistModel } from '../repository/wishlist.model';
import { CreateWishlistDto } from '../api/dtos/create-wish.dto';
import { wishlistEntityLabel } from '../api/dtos/wishlist.i18n';
import { UpdateWishlistDto } from '../api/dtos/update-wish.dto';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

@Injectable()
export class WishlistsService {
  private readonly logger = new Logger(WishlistsService.name);

  constructor(
    @Inject('IWishlistRepository')
    private readonly repo: IWishlistRepository,
  ) {}

  private pickLocale(l?: LocaleLike): CommonLocale {
    return normalizeLocale(l);
  }

  async create(
    dto: CreateWishlistDto,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(dto.preferredLocale);
    const E = wishlistEntityLabel(loc);
    try {
      const dup = await this.repo.findUniqueByOwnerNameUrl(
        dto.ownerId,
        dto.name,
        dto.url ?? null,
      );
      if (dup) {
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      }
      const created = await this.repo.create({
        name: dto.name,
        price: dto.price ?? undefined,
        url: dto.url ?? null,
        ownerId: dto.ownerId,
        orderedById: dto.orderedById ?? null,
        status: dto.status ?? 'OPEN',
      });
      return { message: t('CREATED_OK', loc, E), data: created };
    } catch (err: any) {
      if (err?.code === 'P2002')
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      if (err instanceof ConflictException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async update(
    id: string,
    dto: UpdateWishlistDto,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale ?? dto.preferredLocale);
    const E = wishlistEntityLabel(loc);
    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));

      // ВАЖНО: право редактирования — только владелец
      if (dto.ownerId !== undefined && dto.ownerId !== found.ownerId) {
        throw new ForbiddenException(t('FORBIDDEN', loc, E));
      }

      if (dto.name !== undefined || dto.url !== undefined) {
        const nextName = dto.name ?? found.name;
        const nextUrl = dto.url ?? found.url ?? null;
        const dup = await this.repo.findUniqueByOwnerNameUrl(
          found.ownerId,
          nextName,
          nextUrl,
        );
        if (dup && dup.id !== id)
          throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      }

      const updated = await this.repo.update(id, {
        name: dto.name ?? undefined,
        price: dto.price === undefined ? undefined : dto.price,
        url: dto.url === undefined ? undefined : (dto.url ?? null),
        orderedById:
          dto.orderedById === undefined ? undefined : (dto.orderedById ?? null),
        status: dto.status ?? undefined,
      });
      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException ||
        err instanceof ForbiddenException
      )
        throw err;
      if (err?.code === 'P2002')
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async findAll(): Promise<WishlistModel[]> {
    try {
      return await this.repo.list();
    } catch {
      const loc: CommonLocale = 'EN';
      const E = wishlistEntityLabel(loc);
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async findOne(
    id: string,
    responseLocale?: LocaleLike,
  ): Promise<WishlistModel> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);
    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
      return found;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  async remove(
    id: string,
    responseLocale?: LocaleLike,
    requesterOwnerId?: number,
  ): Promise<{ message: string }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);
    try {
      const found = await this.repo.findById(id);
      if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
      if (
        requesterOwnerId !== undefined &&
        found.ownerId !== requesterOwnerId
      ) {
        throw new ForbiddenException(t('FORBIDDEN', loc, E));
      }
      await this.repo.delete(id);
      return { message: t('DELETED_OK', loc, E) };
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException)
        throw err;
      throw new InternalServerErrorException(t('UNEXPECTED', loc, E));
    }
  }

  // --------- НОВОЕ: выборки и сортировки ---------

  async listByOwner(
    ownerId: number,
    opts?: {
      statuses?: WishlistStatus[];
      orderBy?: 'createdAt' | 'price' | 'name' | 'status';
      sort?: 'asc' | 'desc';
      take?: number;
      skip?: number;
    },
  ): Promise<WishlistModel[]> {
    console.log("ownerId", ownerId)
    return this.repo.listByOwner(ownerId, opts);
  }

  async listByOwnerUsername(
    username: string,
    opts?: {
      statuses?: WishlistStatus[];
      orderBy?: 'createdAt' | 'price' | 'name' | 'status';
      sort?: 'asc' | 'desc';
      take?: number;
      skip?: number;
    },
  ): Promise<WishlistModel[]> {
    return this.repo.listByOwnerUsername(username, opts);
  }

  async searchByOwner(
    ownerId: number,
    query: string,
    opts?: {
      statuses?: WishlistStatus[];
      orderBy?: 'createdAt' | 'price' | 'name' | 'status';
      sort?: 'asc' | 'desc';
      take?: number;
      skip?: number;
    },
  ): Promise<WishlistModel[]> {
    return this.repo.searchByOwner(ownerId, query, opts);
  }

  async countByOwner(
    ownerId: number,
    opts?: { statuses?: WishlistStatus[] },
  ): Promise<number> {
    return this.repo.countByOwner(ownerId, { statuses: opts?.statuses });
  }

  async reserveTheWish(
    id: string,
    reserverUserId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);

    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
    if (found.ownerId === reserverUserId) {
      const after = await this.repo.reserve(id, reserverUserId);
      return { message: t('SELF_RESERVED_OK', loc, E), data: after };
    }

    const after = await this.repo.reserve(id, reserverUserId);
    if (after.status !== 'RESERVED' || after.orderedById !== reserverUserId) {
      throw new ConflictException(t('STATUS_CONFLICT', loc, E));
    }
    return { message: t('RESERVED_OK', loc, E), data: after };
  }

  async unreserveTheWish(
    id: string,
    userId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc /* падеж если нужен */);

    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));

    if (found.status !== 'RESERVED' || found.orderedById !== userId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, E));
    }

    const after = await this.repo.unreserve(id, userId);
    if (after.status !== 'OPEN' || after.orderedById !== null) {
      throw new ConflictException(t('STATUS_CONFLICT', loc, E));
    }
    return { message: t('UNRESERVED_OK', loc, E), data: after };
  }

  async markAsOrdered(
    id: string,
    userId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);

    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
    if (found.ownerId === userId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, E));
    }

    const after = await this.repo.markOrdered(id, userId);
    if (after.status !== 'ORDERED' || after.orderedById == null) {
      throw new ConflictException(t('STATUS_CONFLICT', loc, E));
    }
    return { message: t('ORDERED_OK', loc, E), data: after };
  }

  async markAsFulfilled(
    id: string,
    requesterOwnerId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);

    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(t('NOT_FOUND', loc, E));
    if (found.ownerId !== requesterOwnerId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, E));
    }
    if (found.status !== 'ORDERED') {
      throw new BadRequestException(t('STATUS_CONFLICT', loc, E));
    }

    const after = await this.repo.markFulfilled(id);
    if (after.status !== 'FULFILLED') {
      throw new ConflictException(t('STATUS_CONFLICT', loc, E));
    }
    return { message: t('FULFILLED_OK', loc, E), data: after };
  }
  async listReservedByUser(
    userId: number,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    // Default statuses at service layer
    const statuses =
      opts?.statuses ?? (['RESERVED', 'ORDERED'] as WishlistStatus[]);
    const orderBy = opts?.orderBy;
    const sort = opts?.sort;
    const take = opts?.take;
    const skip = opts?.skip;

    try {
      return await this.repo.listReservedByUser(userId, {
        statuses,
        orderBy,
        sort,
        take,
        skip,
      });
    } catch (error) {
      // Centralized logging at service layer
      this.logger.error(
        `listReservedByUser failed: userId=${userId}, statuses=[${statuses.join(',')}], orderBy=${orderBy ?? '-'}, sort=${sort ?? '-'}, take=${take ?? '-'}, skip=${skip ?? '-'}`,
        (error as Error).stack,
      );
      // Re-throw so global filters/interceptors can handle it
      throw error;
    }
  }
}
