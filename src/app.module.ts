import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [PrismaModule, UsersModule, WishlistModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
