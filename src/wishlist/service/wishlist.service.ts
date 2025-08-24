import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Locale as PrismaLocale, WishlistStatus, Prisma } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { normalizeLocale } from 'src/common/i18n';
import { t } from 'src/common/messages';
import { IWishlistRepository } from '../repository/wishlist.repository';
import { WishlistModel } from '../repository/wishlist.model';
import { CreateWishlistDto } from '../api/dtos/create-wish.dto';
import { wishlistEntityLabel } from '../api/dtos/wishlist.i18n';
import { UpdateWishlistDto } from '../api/dtos/update-wish.dto';


type LocaleLike = CommonLocale | PrismaLocale | undefined;

@Injectable()
export class WishlistsService {
  constructor(
     @Inject('IWishlistRepository')   
    private readonly repo: IWishlistRepository) {}

  private pickLocale(l?: LocaleLike): CommonLocale {
    return normalizeLocale(l);
  }

  async create(dto: CreateWishlistDto): Promise<{ message: string; data: WishlistModel }> {
    const loc = this.pickLocale(dto.preferredLocale);
    const E = wishlistEntityLabel(loc);
    try {
      // Check unique(ownerId, name, url)
      const dup = await this.repo.findUniqueByOwnerNameUrl(dto.ownerId, dto.name, dto.url ?? null);
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
      // safety net for unique violation if race happens
      if (err?.code === 'P2002') {
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      }
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

      // If name/url change, protect composite uniqueness
      if ((dto.name !== undefined) || (dto.url !== undefined)) {
        const nextName = dto.name ?? found.name;
        const nextUrl = dto.url ?? found.url ?? null;
        const dup = await this.repo.findUniqueByOwnerNameUrl(found.ownerId, nextName, nextUrl);
        if (dup && dup.id !== id) {
          throw new ConflictException(t('ALREADY_EXISTS', loc, E));
        }
      }

      const updated = await this.repo.update(id, {
        name: dto.name ?? undefined,
        price: dto.price === undefined ? undefined : dto.price, // keep existing if undefined
        url: dto.url === undefined ? undefined : (dto.url ?? null),
        orderedById: dto.orderedById === undefined ? undefined : (dto.orderedById ?? null),
        status: dto.status ?? undefined,
      });

      return { message: t('UPDATED_OK', loc, E), data: updated };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ConflictException) throw err;
      if (err?.code === 'P2002') {
        throw new ConflictException(t('ALREADY_EXISTS', loc, E));
      }
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

  async findOne(id: string, responseLocale?: LocaleLike): Promise<WishlistModel> {
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

  async remove(id: string, responseLocale?: LocaleLike): Promise<{ message: string }> {
    const loc = this.pickLocale(responseLocale);
    const E = wishlistEntityLabel(loc);
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
