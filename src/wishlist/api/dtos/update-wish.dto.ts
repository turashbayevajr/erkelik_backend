import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  IsInt,
  Min,
} from 'class-validator';
import { Locale, WishlistStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { CreateWishlistDto } from './create-wish.dto';

export class UpdateWishlistDto extends PartialType(CreateWishlistDto) {
  // Prevent changing immutable relation ownerId via update unless you really need it.
  ownerId?: never;

  @IsOptional()
  @IsString()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    try {
      return new Prisma.Decimal(value);
    } catch {
      return value;
    }
  })
  price?: Prisma.Decimal;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderedById?: number;

  @IsOptional()
  @IsEnum(WishlistStatus)
  status?: WishlistStatus;

  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
