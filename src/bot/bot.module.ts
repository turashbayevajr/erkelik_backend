import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { WishNotificationsListener } from './wish-notifications.listener';
import { UsersModule } from 'src/users/users.module';
import { WishlistModule } from 'src/wishlist/wishlist.module';
import { SocialModule } from 'src/social/social.module';
import { MediaModule } from 'src/media/media.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    WishlistModule,
    SocialModule,
    MediaModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [BotService, WishNotificationsListener],
})
export class BotModule {}
