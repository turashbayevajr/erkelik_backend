import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
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
  controllers: [BotController],
  providers: [BotService, WishNotificationsListener],
})
export class BotModule {}
