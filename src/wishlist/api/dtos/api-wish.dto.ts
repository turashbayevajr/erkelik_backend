import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';
import { Prisma, WishVisibility } from '@prisma/client';

// DTO miniapp-API: без ownerId (личность — только из Authorization)
// и без status/orderedById (статусы меняются только методами сервиса).

const toDecimal = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return undefined;
  try {
    return new Prisma.Decimal(value as Prisma.Decimal.Value);
  } catch {
    return value;
  }
};

export class ApiCreateWishDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @Transform(toDecimal)
  price?: Prisma.Decimal;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WishVisibility)
  visibility?: WishVisibility;

  /** Для visibility=CUSTOM: кому именно видно желание */
  @IsOptional()
  @IsInt({ each: true })
  @Min(1, { each: true })
  allowedUserIds?: number[];
}

export class ApiUpdateWishDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @Transform(toDecimal)
  price?: Prisma.Decimal;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WishVisibility)
  visibility?: WishVisibility;

  @IsOptional()
  @IsInt({ each: true })
  @Min(1, { each: true })
  allowedUserIds?: number[];
}
