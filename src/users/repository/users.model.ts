import { Locale, WishVisibility } from '@prisma/client';

export interface UserModel {
  id: number;
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  preferredLocale: Locale;
  defaultVisibility: WishVisibility;
  createdAt: Date;
  updatedAt: Date;
}
