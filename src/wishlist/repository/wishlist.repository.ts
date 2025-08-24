import { Injectable } from '@nestjs/common';
import { Prisma, WishlistStatus } from '@prisma/client';
import { WishlistModel } from './wishlist.model';
import { PrismaService } from 'src/prisma/prisma.service';

export interface IWishlistRepository {
  findById(id: string): Promise<WishlistModel | null>;
  findUniqueByOwnerNameUrl(ownerId: number, name: string, url?: string | null): Promise<WishlistModel | null>;
  list(): Promise<WishlistModel[]>;
  create(data: {
    name: string;
    price?: Prisma.Decimal;
    url?: string | null;
    ownerId: number;
    orderedById?: number | null;
    status?: WishlistStatus;
  }): Promise<WishlistModel>;
  update(id: string, data: {
    name?: string;
    price?: Prisma.Decimal | null;
    url?: string | null;
    orderedById?: number | null;
    status?: WishlistStatus;
  }): Promise<WishlistModel>;
  delete(id: string): Promise<void>;
}

function map(row: Prisma.WishlistUncheckedCreateInput & any): WishlistModel {
  return {
    id: row.id,
    name: row.name,
    price: row.price ? String(row.price) : null,
    url: row.url ?? null,
    ownerId: row.ownerId,
    orderedById: row.orderedById ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class WishlistRepository implements IWishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WishlistModel | null> {
    const row = await this.prisma.wishlist.findUnique({ where: { id } });
    return row ? map(row) : null;
  }

  async findUniqueByOwnerNameUrl(
    ownerId: number,
    name: string,
    url?: string | null,
  ): Promise<WishlistModel | null> {
    const row = await this.prisma.wishlist.findFirst({
      where: { ownerId, name, url: url ?? null },
    });
    return row ? map(row) : null;
  }

  async list(): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(map);
  }

  async create(data: {
    name: string;
    price?: Prisma.Decimal;
    url?: string | null;
    ownerId: number;
    orderedById?: number | null;
    status?: WishlistStatus;
  }): Promise<WishlistModel> {
    const row = await this.prisma.wishlist.create({
      data: {
        name: data.name,
        price: data.price ?? undefined,
        url: data.url ?? null,
        ownerId: data.ownerId,
        orderedById: data.orderedById ?? null,
        status: data.status ?? 'OPEN',
      },
    });
    return map(row);
  }

  async update(id: string, data: {
    name?: string;
    price?: Prisma.Decimal | null;
    url?: string | null;
    orderedById?: number | null;
    status?: WishlistStatus;
  }): Promise<WishlistModel> {
    const row = await this.prisma.wishlist.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        price: data.price === undefined ? undefined : data.price,
        url: data.url === undefined ? undefined : (data.url ?? null),
        orderedById: data.orderedById === undefined ? undefined : (data.orderedById ?? null),
        status: data.status ?? undefined,
      },
    });
    return map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.wishlist.delete({ where: { id } });
  }
}
