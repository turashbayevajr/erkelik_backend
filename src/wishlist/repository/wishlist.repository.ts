import { Injectable } from '@nestjs/common';
import { Prisma, WishlistStatus } from '@prisma/client';
import { WishlistModel } from './wishlist.model';
import { PrismaService } from 'src/prisma/prisma.service';

export interface ListOptions {
  statuses?: WishlistStatus[];
  orderBy?: 'createdAt' | 'price' | 'name' | 'status';
  sort?: 'asc' | 'desc';
  take?: number;
  skip?: number;
}

export interface IWishlistRepository {
  findById(id: string): Promise<WishlistModel | null>;
  findUniqueByOwnerNameUrl(
    ownerId: number,
    name: string,
    url?: string | null,
  ): Promise<WishlistModel | null>;

  list(): Promise<WishlistModel[]>;

  listByOwner(ownerId: number, opts?: ListOptions): Promise<WishlistModel[]>;
  listReservedByUser(
    userId: number,
    opts?: ListOptions,
  ): Promise<WishlistModel[]>;
  listByOwnerUsername(
    username: string,
    opts?: ListOptions,
  ): Promise<WishlistModel[]>;
  searchByOwner(
    ownerId: number,
    query: string,
    opts?: ListOptions,
  ): Promise<WishlistModel[]>;
  countByOwner(
    ownerId: number,
    opts?: Omit<ListOptions, 'take' | 'skip'>,
  ): Promise<number>;

  create(data: {
    name: string;
    price?: Prisma.Decimal;
    url?: string | null;
    ownerId: number;
    orderedById?: number | null;
    status?: WishlistStatus;
  }): Promise<WishlistModel>;

  update(
    id: string,
    data: {
      name?: string;
      price?: Prisma.Decimal | null;
      url?: string | null;
      orderedById?: number | null;
      status?: WishlistStatus;
    },
  ): Promise<WishlistModel>;

  delete(id: string): Promise<void>;

  reserve(id: string, reserverUserId: number): Promise<WishlistModel>;
  unreserve(id: string, userId: number): Promise<WishlistModel>;
  markOrdered(id: string, userId: number): Promise<WishlistModel>;
  markFulfilled(id: string): Promise<WishlistModel>;
}
function map(row: Prisma.WishlistUncheckedCreateInput & any): WishlistModel {
  return {
    id: row.id,
    name: row.name,
    price: row.price ? String(row.price) : null,
    url: row.url ?? null,
    ownerId: row.ownerId,
    ownerName: row.owner?.username ?? null,
    orderedById: row.orderedById ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOrderBy(
  orderBy?: 'createdAt' | 'price' | 'name' | 'status',
  sort?: 'asc' | 'desc',
) {
  const key = orderBy ?? 'createdAt';
  const dir = sort ?? 'desc';
  return { [key]: dir } as Prisma.WishlistOrderByWithRelationInput;
}

function toWhere(
  ownerId?: number,
  statuses?: WishlistStatus[],
  query?: string,
): Prisma.WishlistWhereInput {
  const where: Prisma.WishlistWhereInput = {};
  if (ownerId !== undefined) where.ownerId = ownerId;
  if (statuses && statuses.length > 0) where.status = { in: statuses };
  if (query && query.trim())
    where.name = { contains: query.trim(), mode: 'insensitive' };
  return where;
}

@Injectable()
export class WishlistRepository implements IWishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WishlistModel | null> {
    const row = await this.prisma.wishlist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        url: true,
        price: true,
        ownerId: true,
        status: true,
        createdAt: true,
        owner: {
          select: { username: true },
        },
      },
    });
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
    const rows = await this.prisma.wishlist.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(map);
  }

  async listByOwner(
    ownerId: number,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: toWhere(ownerId, opts?.statuses),
      orderBy: toOrderBy(opts?.orderBy, opts?.sort),
      take: opts?.take,
      skip: opts?.skip,
    });
    return rows.map(map);
  }
  async listReservedByUser(
    userId: number,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: {
        orderedById: userId,
        ...(opts?.statuses && opts.statuses.length > 0
          ? { status: { in: opts.statuses } }
          : {}),
      },
      orderBy: toOrderBy(opts?.orderBy, opts?.sort),
      take: opts?.take,
      skip: opts?.skip,
      select: {
        id: true,
        name: true,
        ownerId: true,
        url: true,
        price: true,
        status: true,
        createdAt: true,
        owner: {
          select: { username: true },
        },
      },
    });
    return rows.map(map);
  }

  async listByOwnerUsername(
    username: string,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: {
        ...toWhere(undefined, opts?.statuses),
        owner: { username },
      },
      orderBy: toOrderBy(opts?.orderBy, opts?.sort),
      take: opts?.take,
      skip: opts?.skip,
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
        createdAt: true,
        owner: {
          select: { username: true },
        },
      },
    });
    return rows.map(map);
  }

  async searchByOwner(
    ownerId: number,
    query: string,
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: toWhere(ownerId, opts?.statuses, query),
      orderBy: toOrderBy(opts?.orderBy, opts?.sort),
      take: opts?.take,
      skip: opts?.skip,
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
        createdAt: true,
        owner: {
          select: { username: true },
        },
      },
    });
    return rows.map(map);
  }

  async countByOwner(
    ownerId: number,
    opts?: Omit<ListOptions, 'take' | 'skip'>,
  ): Promise<number> {
    return this.prisma.wishlist.count({
      where: toWhere(ownerId, opts?.statuses),
    });
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

  async update(
    id: string,
    data: {
      name?: string;
      price?: Prisma.Decimal | null;
      url?: string | null;
      orderedById?: number | null;
      status?: WishlistStatus;
    },
  ): Promise<WishlistModel> {
    const row = await this.prisma.wishlist.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        price: data.price === undefined ? undefined : data.price,
        url: data.url === undefined ? undefined : (data.url ?? null),
        orderedById:
          data.orderedById === undefined
            ? undefined
            : (data.orderedById ?? null),
        status: data.status ?? undefined,
      },
    });
    return map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.wishlist.delete({ where: { id } });
  }

  async reserve(id: string, reserverUserId: number): Promise<WishlistModel> {
    const res = await this.prisma.wishlist.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'RESERVED', orderedById: reserverUserId },
    });
    if (res.count !== 1) {
    }
    const row = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!row) throw new Error('reserve: row not found after updateMany');
    return map(row);
  }

  async unreserve(id: string, userId: number): Promise<WishlistModel> {
    const res = await this.prisma.wishlist.updateMany({
      where: { id, status: 'RESERVED', orderedById: userId },
      data: { status: 'OPEN', orderedById: null },
    });
    if (res.count !== 1) {
    }
    const row = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!row) throw new Error('unreserve: row not found after updateMany');
    return map(row);
  }

  async markOrdered(id: string, userId: number): Promise<WishlistModel> {
    const updatedFromReserved = await this.prisma.wishlist.updateMany({
      where: { id, status: 'RESERVED' },
      data: { status: 'ORDERED', orderedById: userId },
    });

    if (updatedFromReserved.count === 0) {
      const updatedFromOpen = await this.prisma.wishlist.updateMany({
        where: { id, status: 'OPEN' },
        data: { status: 'ORDERED', orderedById: userId },
      });
      if (updatedFromOpen.count === 0) {
      }
    }

    const row = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!row) throw new Error('markOrdered: row not found after updateMany');
    return map(row);
  }

  async markFulfilled(id: string): Promise<WishlistModel> {
    const res = await this.prisma.wishlist.updateMany({
      where: { id, status: 'ORDERED' },
      data: { status: 'FULFILLED' },
    });
    if (res.count !== 1) {
    }
    const row = await this.prisma.wishlist.findUnique({ where: { id } });
    if (!row) throw new Error('markFulfilled: row not found after updateMany');
    return map(row);
  }
}
