import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Locale } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Prevent updating telegramId via this DTO to keep uniqueness stable
  telegramId?: never;

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
