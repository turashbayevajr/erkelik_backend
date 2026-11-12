import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';
import { Locale, WishlistStatus, WishVisibility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { MAX_WISH_IMAGES } from '../../wish-images';

export class CreateWishlistDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name!: string;

  /**
   * Accept number/string and normalize to Prisma.Decimal (or undefined).
   * We keep Decimal in DTO for type safety and pass through to service.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    try {
      return new Prisma.Decimal(value);
    } catch {
      return value; // let class-validator/type checking fail later
    }
  })
  price?: Prisma.Decimal;

  @IsOptional()
  @IsUrl({ require_protocol: false }) // allow bare domains too if needed
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  ownerId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderedById?: number;

  @IsOptional()
  @IsEnum(WishlistStatus)
  status?: WishlistStatus; // defaults to OPEN in DB

  @IsOptional()
  @IsEnum(WishVisibility)
  visibility?: WishVisibility; // defaults to PUBLIC in DB

  /** Для visibility=CUSTOM: кому именно видно желание */
  @IsOptional()
  @IsInt({ each: true })
  @Min(1, { each: true })
  allowedUserIds?: number[];

  /** Ключи фото из POST /api/media; порядок = порядок показа, первое — обложка. */
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_WISH_IMAGES)
  imageKeys?: string[];

  /** Optional response/user locale hint */
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
