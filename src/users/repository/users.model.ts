import { Locale } from "@prisma/client";

export interface UserModel {
  id: number;
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  preferredLocale: Locale;
  createdAt: Date;
  updatedAt: Date;
}
