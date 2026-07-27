import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { localeFromLanguageCode } from 'src/common/i18n';
import { verifyInitData } from 'src/common/init-data';
import { verifyJwt } from 'src/common/jwt';
import { UserService } from 'src/users/service/users.service';
import type { UserModel } from 'src/users/repository/users.model';
import { IS_PUBLIC_KEY } from './public.decorator';
import { jwtSecret, type AuthRequest } from './auth-user';

/**
 * Единый guard всех HTTP-роутов. Личность — только из Authorization:
 * `tma <initData>` внутри Telegram, `Bearer <jwt>` снаружи. Любая ошибка —
 * одинаковый 401 без деталей.
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    private readonly users: UserService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const user = await this.resolveUser(req.headers.authorization);
    if (!user) throw new UnauthorizedException('Invalid initData');
    req.user = user;
    return true;
  }

  private async resolveUser(
    header: string | undefined,
  ): Promise<UserModel | null> {
    if (!header) return null;
    const spaceAt = header.indexOf(' ');
    if (spaceAt < 0) return null;
    const scheme = header.slice(0, spaceAt);
    const value = header.slice(spaceAt + 1).trim();
    if (!value) return null;

    if (scheme === 'tma') {
      const verified = verifyInitData(value, process.env.BOT_TOKEN ?? '');
      if (!verified) return null;
      const { data } = await this.users.registerOrUpdateByTelegramId(
        BigInt(verified.user.id),
        verified.user.username,
        {
          firstName: verified.user.first_name ?? null,
          lastName: verified.user.last_name ?? null,
          initialPreferredLocale: localeFromLanguageCode(
            verified.user.language_code,
          ),
        },
      );
      return data;
    }

    if (scheme === 'Bearer') {
      const payload = verifyJwt(value, jwtSecret());
      if (!payload) return null;
      let telegramId: bigint;
      try {
        telegramId = BigInt(payload.sub);
      } catch {
        return null;
      }
      return this.users.findByTelegramId(telegramId);
    }

    return null;
  }
}
