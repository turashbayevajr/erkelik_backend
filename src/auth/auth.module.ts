import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from 'src/users/users.module';
import { ApiAuthGuard } from './api-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Guard подключается глобально (APP_GUARD): каждый HTTP-роут закрыт,
// исключения помечаются @Public(). Так legacy-роуты закрываются
// автоматически, без циклических импортов модулей.
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: ApiAuthGuard }],
})
export class AuthModule {}
