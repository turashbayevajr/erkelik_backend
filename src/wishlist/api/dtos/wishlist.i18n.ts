import type { Locale as CommonLocale } from 'src/common/i18n';
import type { Locale as PrismaLocale } from '@prisma/client';
import { normalizeLocale } from 'src/common/i18n';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

export function wishlistEntityLabel(locale?: LocaleLike): string {
  switch (normalizeLocale(locale)) {
    case 'RU':
      return 'Желание';
    case 'KK':
      return 'Еркелік';
    default:
      return 'Wishlist';
  }
}
