import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import type { Locale as PrismaLocale } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { WishlistsService } from '../service/wishlist.service';
import { CreateWishlistDto } from './dtos/create-wish.dto';
import { UpdateWishlistDto } from './dtos/update-wish.dto';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

@Controller('api/v1/web/wishlists')
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  // POST /wishlists
  @Post()
  create(@Body() dto: CreateWishlistDto) {
    return this.service.create(dto);
  }

  // GET /wishlists
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // GET /wishlists/:id?locale=EN|RU|KK
  @Get(':id')
  findOne(@Param('id') id: string, @Query('locale') locale?: LocaleLike) {
    return this.service.findOne(id, locale);
  }

  // PATCH /wishlists/:id?locale=EN|RU|KK
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWishlistDto,
    @Query('locale') locale?: LocaleLike,
  ) {
    return this.service.update(id, dto, locale);
  }

  // DELETE /wishlists/:id?locale=EN|RU|KK
  @Delete(':id')
  remove(@Param('id') id: string, @Query('locale') locale?: LocaleLike) {
    return this.service.remove(id, locale);
  }
}
