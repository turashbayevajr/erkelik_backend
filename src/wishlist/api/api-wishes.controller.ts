import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/auth-user';
import { t } from 'src/common/messages';
import { normalizeLocale } from 'src/common/i18n';
import type { UserModel } from 'src/users/repository/users.model';
import { UserService } from 'src/users/service/users.service';
import { SocialService } from 'src/social/service/social.service';
import { WishlistsService } from '../service/wishlist.service';
import type { WishlistModel } from '../repository/wishlist.model';
import { wishlistEntityLabel } from './dtos/wishlist.i18n';
import { ApiCreateWishDto, ApiUpdateWishDto } from './dtos/api-wish.dto';
import { mediaUrl } from 'src/media/service/media.service';

function toApiImages(w: WishlistModel) {
  return w.images.map((im) => ({ ...im, url: mediaUrl(im.key) }));
}

// Тайна дарителя: владелец не видит ни статуса брони, ни бронирующего —
// в owner-представлении статус маскируется до OPEN/FULFILLED.
function toOwnerWish(w: WishlistModel) {
  return {
    id: w.id,
    name: w.name,
    price: w.price,
    url: w.url,
    description: w.description,
    images: toApiImages(w),
    visibility: w.visibility,
    status: w.status === 'FULFILLED' ? 'FULFILLED' : 'OPEN',
    createdAt: w.createdAt,
  };
}

// Даритель видит реальный статус, но никогда — кто бронировал (только
// булев признак «это моя бронь»).
function toGiverWish(w: WishlistModel, viewerId: number) {
  return {
    id: w.id,
    name: w.name,
    price: w.price,
    url: w.url,
    description: w.description,
    images: toApiImages(w),
    status: w.status,
    reservedByMe: w.orderedById === viewerId,
    createdAt: w.createdAt,
  };
}

@Controller('api')
export class ApiWishesController {
  constructor(
    private readonly wishes: WishlistsService,
    private readonly users: UserService,
    private readonly social: SocialService,
  ) {}

  private notFound(user: UserModel): NotFoundException {
    const loc = normalizeLocale(user.preferredLocale);
    return new NotFoundException(t('NOT_FOUND', loc, wishlistEntityLabel(loc)));
  }

  /** Невидимое желание отвечает как «не найдено», не как «запрещено». */
  private async visibleOr404(
    id: string,
    user: UserModel,
  ): Promise<WishlistModel> {
    const wish = await this.wishes.findOne(id, user.preferredLocale);
    if (!(await this.wishes.canView(wish, user.id))) throw this.notFound(user);
    return wish;
  }

  private async ownOr404(id: string, user: UserModel): Promise<WishlistModel> {
    const wish = await this.visibleOr404(id, user);
    if (wish.ownerId !== user.id) {
      const loc = normalizeLocale(user.preferredLocale);
      throw new ForbiddenException(
        t('FORBIDDEN', loc, wishlistEntityLabel(loc)),
      );
    }
    return wish;
  }

  // --------- Мои желания ---------

  @Get('wishes')
  async myWishes(@CurrentUser() user: UserModel) {
    const list = await this.wishes.listByOwner(user.id);
    return list.map(toOwnerWish);
  }

  @Post('wishes')
  async create(@CurrentUser() user: UserModel, @Body() dto: ApiCreateWishDto) {
    const { data } = await this.wishes.create({
      name: dto.name,
      price: dto.price,
      url: dto.url,
      description: dto.description,
      visibility: dto.visibility ?? user.defaultVisibility,
      allowedUserIds: dto.allowedUserIds,
      imageKeys: dto.imageKeys,
      ownerId: user.id,
      preferredLocale: user.preferredLocale,
    });
    return toOwnerWish(data);
  }

  @Patch('wishes/:id')
  async update(
    @CurrentUser() user: UserModel,
    @Param('id') id: string,
    @Body() dto: ApiUpdateWishDto,
  ) {
    await this.ownOr404(id, user);
    const { data } = await this.wishes.update(id, dto, user.preferredLocale);
    return toOwnerWish(data);
  }

  @Delete('wishes/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: UserModel, @Param('id') id: string) {
    await this.wishes.remove(id, user.preferredLocale, user.id);
  }

  @Post('wishes/:id/fulfilled')
  async fulfilled(@CurrentUser() user: UserModel, @Param('id') id: string) {
    const { data } = await this.wishes.markAsFulfilled(
      id,
      user.id,
      user.preferredLocale,
    );
    return toOwnerWish(data);
  }

  // --------- Действия дарителя ---------

  @Post('wishes/:id/reserve')
  async reserve(@CurrentUser() user: UserModel, @Param('id') id: string) {
    await this.visibleOr404(id, user);
    const { data } = await this.wishes.reserveTheWish(
      id,
      user.id,
      user.preferredLocale,
    );
    return toGiverWish(data, user.id);
  }

  @Post('wishes/:id/unreserve')
  async unreserve(@CurrentUser() user: UserModel, @Param('id') id: string) {
    await this.visibleOr404(id, user);
    const { data } = await this.wishes.unreserveTheWish(
      id,
      user.id,
      user.preferredLocale,
    );
    return toGiverWish(data, user.id);
  }

  @Post('wishes/:id/ordered')
  async ordered(@CurrentUser() user: UserModel, @Param('id') id: string) {
    await this.visibleOr404(id, user);
    const { data } = await this.wishes.markAsOrdered(
      id,
      user.id,
      user.preferredLocale,
    );
    return toGiverWish(data, user.id);
  }

  // --------- Чужой вишлист ---------

  @Get('users/:username/wishes')
  async friendWishes(
    @CurrentUser() user: UserModel,
    @Param('username') username: string,
  ) {
    const owner = await this.users.findByUsername(
      username,
      user.preferredLocale,
    );
    const own = owner.id === user.id;
    const [wishes, subscribed, friendship] = await Promise.all([
      this.wishes.listVisibleByOwner(owner.id, user.id),
      own
        ? Promise.resolve(false)
        : this.social.isSubscribed(user.id, owner.id),
      this.social.friendshipBetween(user.id, owner.id),
    ]);
    return {
      owner: {
        id: owner.id,
        username: owner.username ?? null,
        firstName: owner.firstName ?? null,
      },
      subscribed,
      friendship,
      wishes: wishes.map((w) =>
        own ? toOwnerWish(w) : toGiverWish(w, user.id),
      ),
    };
  }
}
