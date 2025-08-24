import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UsersModule } from 'src/users/users.module';
import { WishlistModule } from 'src/wishlist/wishlist.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    WishlistModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [BotService],
})
export class BotModule {}
