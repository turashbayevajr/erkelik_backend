import { Locale } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Matches(/^\d+$/, { message: 'telegramId must be a numeric string' })
  @Transform(({ value }) => {
    try {
      return BigInt(value);
    } catch {
      return value; // will fail later if invalid
    }
  })
  telegramId!: bigint;

  @IsOptional()
  @IsString()
  @Length(3, 32)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  lastName?: string;

  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
