// src/wishlists/wishlist.module.ts
import { Module } from '@nestjs/common';
import { WishlistsController } from './api/wishlist.controller';
import { WishlistsService } from './service/wishlist.service';
import { WishlistRepository } from './repository/wishlist.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WishlistsController],
  providers: [
    PrismaService,
    { provide: 'IWishlistRepository', useClass: WishlistRepository },
    WishlistsService,
  ],
  exports: [
    WishlistsService,
    'IWishlistRepository',
  ],
})
export class WishlistModule {}
