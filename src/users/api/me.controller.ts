import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, toPublicUser } from 'src/auth/auth-user';
import type { UserModel } from '../repository/users.model';
import { UserService } from '../service/users.service';
import { UpdateMeDto } from './dtos/update-me.dto';

@Controller('api/me')
export class MeController {
  constructor(private readonly users: UserService) {}

  @Get()
  me(@CurrentUser() user: UserModel) {
    return toPublicUser(user);
  }

  @Patch()
  async update(@CurrentUser() user: UserModel, @Body() dto: UpdateMeDto) {
    const { data } = await this.users.updateProfileByTelegramId(
      user.telegramId,
      {
        preferredLocale: dto.preferredLocale,
        defaultVisibility: dto.defaultVisibility,
      },
      dto.preferredLocale ?? user.preferredLocale,
    );
    return toPublicUser(data);
  }
}
