// src/wishlists/wishlist.module.ts
import { Module } from '@nestjs/common';
import { WishlistsController } from './api/wishlist.controller';
import { ApiWishesController } from './api/api-wishes.controller';
import { WishlistsService } from './service/wishlist.service';
import { WishlistRepository } from './repository/wishlist.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { SocialModule } from 'src/social/social.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [SocialModule, UsersModule],
  controllers: [WishlistsController, ApiWishesController],
  providers: [
    PrismaService,
    { provide: 'IWishlistRepository', useClass: WishlistRepository },
    WishlistsService,
  ],
  exports: [WishlistsService, 'IWishlistRepository'],
})
export class WishlistModule {}
