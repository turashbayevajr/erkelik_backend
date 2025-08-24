import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [PrismaModule, UsersModule, WishlistModule, BotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
