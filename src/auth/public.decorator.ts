import { SetMetadata } from '@nestjs/common';

// Единственное применение — POST /api/auth/login и health-роут.
// Всё остальное закрыто глобальным ApiAuthGuard.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
