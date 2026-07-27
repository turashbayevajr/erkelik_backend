import { Injectable, UnauthorizedException } from '@nestjs/common';
import { signJwt } from 'src/common/jwt';
import { UserService } from 'src/users/service/users.service';
import { jwtSecret, toPublicUser } from './auth-user';

@Injectable()
export class AuthService {
  constructor(private readonly users: UserService) {}

  async login(login: string, password: string) {
    const user = await this.users.validateCredentials(login, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return {
      token: signJwt(user.telegramId.toString(), jwtSecret()),
      user: toPublicUser(user),
    };
  }
}
