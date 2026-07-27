import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { SocialRepository } from './repository/social.repository';
import { SocialService } from './service/social.service';
import { SocialController } from './api/social.controller';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [SocialController],
  providers: [
    SocialService,
    { provide: 'ISocialRepository', useClass: SocialRepository },
  ],
  exports: [SocialService],
})
export class SocialModule {}
