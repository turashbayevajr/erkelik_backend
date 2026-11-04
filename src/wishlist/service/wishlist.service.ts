import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Locale as PrismaLocale, WishlistStatus } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { normalizeLocale } from 'src/common/i18n';
import { t } from 'src/common/messages';
import { isPriceWithinRange } from 'src/common/price';
import { SocialService } from 'src/social/service/social.service';
import { WISH_CREATED, WishCreatedEvent } from '../wish-created.event';
import { WISH_UPDATED, WishUpdatedEvent } from '../wish-updated.event';
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
    private readonly social: SocialService,
    private readonly events: EventEmitter2,
  ) {}

  private pickLocale(l?: LocaleLike): CommonLocale {
    return normalizeLocale(l);
  }

  /**
   * Цена вне numeric(12,2) роняет запрос ошибкой Postgres без кода Prisma —
   * её не отличить от любой другой, поэтому проверяем до записи.
   */
  private assertPriceWithinRange(price: unknown, loc: CommonLocale): void {
    if (!isPriceWithinRange(price)) {
      throw new BadRequestException(t('PRICE_TOO_LARGE', loc, ''));
    }
  }

  /**
   * Ожидаемые HTTP-ошибки пропускаем как есть, остальное логируем перед
   * тем, как спрятать за UNEXPECTED: иначе причина сбоя теряется.
   */
  private rethrowOrUnexpected(
    err: unknown,
    loc: CommonLocale,
    entityLabel: string,
    context: string,
  ): never {
    if ((err as { code?: string })?.code === 'P2002') {
      throw new ConflictException(t('ALREADY_EXISTS', loc, entityLabel));
    }
    if (
      err instanceof HttpException &&
      !(err instanceof InternalServerErrorException)
    ) {
      throw err;
    }
    this.logger.error(
      `${context} failed`,
      (err as Error)?.stack ?? String(err),
    );
    throw new InternalServerErrorException(t('UNEXPECTED', loc, entityLabel));
  }

  async create(
    dto: CreateWishlistDto,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(dto.preferredLocale);
    const E = wishlistEntityLabel(loc);
    this.assertPriceWithinRange(dto.price, loc);
    try {
      const dup = await this.repo.findUniqueByOwnerNameUrl(
        dto.ownerId,
        dto.name,
        dto.url ?? null,
        dto.description ?? null,
      );
      if (dup) {
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      }
      const created = await this.repo.create({
        name: dto.name,
        price: dto.price ?? undefined,
        url: dto.url ?? null,
        ownerId: dto.ownerId,
        description: dto.description ?? null,
        orderedById: dto.orderedById ?? null,
        status: dto.status ?? 'OPEN',
        visibility: dto.visibility ?? 'PUBLIC',
        allowedUserIds: dto.allowedUserIds,
      });
      this.events.emit(
        WISH_CREATED,
        new WishCreatedEvent(
          created.id,
          created.ownerId,
          created.name,
          created.visibility,
        ),
      );
      return { message: t('CREATED_OK', loc, E), data: created };
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, E, `create(ownerId=${dto.ownerId})`);
    }
  }

  async update(
    id: string,
    dto: UpdateWishlistDto,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(responseLocale ?? dto.preferredLocale);
    const E = wishlistEntityLabel(loc);
    this.assertPriceWithinRange(dto.price, loc);
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
        description:
          dto.description === undefined ? undefined : (dto.description ?? null),
        orderedById:
          dto.orderedById === undefined ? undefined : (dto.orderedById ?? null),
        status: dto.status ?? undefined,
        visibility: dto.visibility ?? undefined,
        allowedUserIds: dto.allowedUserIds,
      });

      // Даритель узнаёт об изменении содержимого своей брони.
      // Тайна не нарушается: событие уходит бронирующему, не владельцу.
      if (
        this.contentChanged(found, dto) &&
        found.orderedById != null &&
        found.orderedById !== found.ownerId &&
        (found.status === 'RESERVED' || found.status === 'ORDERED')
      ) {
        this.events.emit(
          WISH_UPDATED,
          new WishUpdatedEvent(
            updated.id,
            updated.ownerId,
            updated.name,
            found.orderedById,
          ),
        );
      }
      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, E, `update(id=${id})`);
    }
  }

  /** Изменились ли содержательные поля (имя/цена/ссылка/описание). */
  private contentChanged(
    found: WishlistModel,
    dto: UpdateWishlistDto,
  ): boolean {
    if (dto.name !== undefined && dto.name !== found.name) return true;
    if (
      dto.price !== undefined &&
      String(dto.price ?? '') !== String(found.price ?? '')
    )
      return true;
    if (dto.url !== undefined && (dto.url ?? null) !== (found.url ?? null))
      return true;
    if (
      dto.description !== undefined &&
      (dto.description ?? null) !== (found.description ?? null)
    )
      return true;
    return false;
  }

  async findAll(): Promise<WishlistModel[]> {
    const loc: CommonLocale = 'EN';
    try {
      return await this.repo.list();
    } catch (err) {
      this.rethrowOrUnexpected(err, loc, wishlistEntityLabel(loc), 'findAll');
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
      this.rethrowOrUnexpected(err, loc, E, `findOne(id=${id})`);
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
      this.rethrowOrUnexpected(err, loc, E, `remove(id=${id})`);
    }
  }

  // --------- Видимость ---------

  /**
   * Чужой вишлист глазами viewer: PUBLIC всем, FRIENDS — друзьям,
   * CUSTOM — только из списка доступа. Свой список — без фильтра.
   */
  async listVisibleByOwner(
    ownerId: number,
    viewerId: number,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    if (ownerId === viewerId) return this.repo.listByOwner(ownerId, opts);
    const isFriend = await this.social.areFriends(ownerId, viewerId);
    return this.repo.listVisibleByOwner(ownerId, { viewerId, isFriend }, opts);
  }

  async canView(wish: WishlistModel, viewerId: number): Promise<boolean> {
    if (wish.ownerId === viewerId) return true;
    switch (wish.visibility) {
      case 'PUBLIC':
        return true;
      case 'FRIENDS':
        return this.social.areFriends(wish.ownerId, viewerId);
      case 'CUSTOM':
        return this.repo.hasAccess(wish.id, viewerId);
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
    if (!['ORDERED', 'RESERVED'].includes(found.status)) {
      throw new BadRequestException(
        t('STATUS_CONFLICT', loc, E) +
          ` (expected ORDERED|RESERVED, got ${found.status})`,
      );
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
