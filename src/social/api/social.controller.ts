import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/auth-user';
import type { UserModel } from 'src/users/repository/users.model';
import { UserService } from 'src/users/service/users.service';
import { SocialService } from '../service/social.service';

@Controller('api/social')
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly users: UserService,
  ) {}

  @Get('friends')
  async friends(@CurrentUser() user: UserModel) {
    const list = await this.social.listFriends(user.id);
    return list.map((f) => ({
      id: f.userId,
      username: f.username,
      firstName: f.firstName,
    }));
  }

  @Get('requests')
  async requests(@CurrentUser() user: UserModel) {
    const list = await this.social.listIncomingRequests(user.id);
    return list.map((r) => ({
      id: r.friendshipId,
      username: r.requesterUsername,
      firstName: r.requesterFirstName,
    }));
  }

  @Post('requests/:id/accept')
  acceptRequest(
    @CurrentUser() user: UserModel,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.social.acceptFriend(id, user.id, user.preferredLocale);
  }

  @Post('subscriptions/:username')
  async subscribe(
    @CurrentUser() user: UserModel,
    @Param('username') username: string,
  ) {
    const target = await this.users.findByUsername(
      username,
      user.preferredLocale,
    );
    return this.social.subscribe(user.id, target.id, user.preferredLocale);
  }

  @Delete('subscriptions/:username')
  async unsubscribe(
    @CurrentUser() user: UserModel,
    @Param('username') username: string,
  ) {
    const target = await this.users.findByUsername(
      username,
      user.preferredLocale,
    );
    return this.social.unsubscribe(user.id, target.id, user.preferredLocale);
  }

  @Post('friend-requests/:username')
  async requestFriend(
    @CurrentUser() user: UserModel,
    @Param('username') username: string,
  ) {
    const target = await this.users.findByUsername(
      username,
      user.preferredLocale,
    );
    return this.social.requestFriend(user.id, target.id, user.preferredLocale);
  }
}
