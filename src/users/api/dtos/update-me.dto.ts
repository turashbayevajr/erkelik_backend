import { IsEnum, IsOptional } from 'class-validator';
import { Locale, WishVisibility } from '@prisma/client';

export class UpdateMeDto {
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;

  @IsOptional()
  @IsEnum(WishVisibility)
  defaultVisibility?: WishVisibility;
}
