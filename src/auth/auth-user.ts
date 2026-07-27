import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserModel } from 'src/users/repository/users.model';

export interface AuthRequest extends Request {
  user: UserModel;
}

/** Пользователь, положенный в request ApiAuthGuard'ом. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserModel => {
    return ctx.switchToHttp().getRequest<AuthRequest>().user;
  },
);

export function jwtSecret(): string {
  return process.env.JWT_SECRET || process.env.BOT_TOKEN || '';
}

/**
 * Публичное представление пользователя для /api-ответов.
 * telegramId наружу не отдаём (и BigInt не сериализуется в JSON).
 */
export function toPublicUser(user: UserModel) {
  return {
    id: user.id,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    preferredLocale: user.preferredLocale,
    defaultVisibility: user.defaultVisibility,
  };
}
