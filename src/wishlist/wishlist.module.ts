// src/wishlists/wishlist.module.ts
import { Module } from '@nestjs/common';
import { WishlistsController } from './api/wishlist.controller';
import { ApiWishesController } from './api/api-wishes.controller';
import { WishlistsService } from './service/wishlist.service';
import { WishlistRepository } from './repository/wishlist.repository';
import { WishImagesCleanupJob } from './wish-images-cleanup.job';
import { PrismaService } from 'src/prisma/prisma.service';
import { SocialModule } from 'src/social/social.module';
import { UsersModule } from 'src/users/users.module';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [SocialModule, UsersModule, MediaModule],
  controllers: [WishlistsController, ApiWishesController],
  providers: [
    PrismaService,
    { provide: 'IWishlistRepository', useClass: WishlistRepository },
    WishlistsService,
    WishImagesCleanupJob,
  ],
  exports: [WishlistsService, 'IWishlistRepository'],
})
export class WishlistModule {}
