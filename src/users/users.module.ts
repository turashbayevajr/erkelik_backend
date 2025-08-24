import { Module } from '@nestjs/common';
import { UsersController } from './api/users.controller';
import { UserService } from './service/users.service';
import { UserRepository } from './repository/users.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UserService,  { provide: 'IUserRepository', useClass: UserRepository }, PrismaService],
  exports: [UserService,  { provide: 'IUserRepository', useClass: UserRepository },],
})
export class UsersModule {}
