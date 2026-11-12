import { Injectable } from '@nestjs/common';
import { Prisma, WishlistStatus, WishVisibility } from '@prisma/client';
import { WishImageModel, WishlistModel } from './wishlist.model';
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
    description?: string | null,
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

  listVisibleByOwner(
    ownerId: number,
    viewer: { viewerId: number; isFriend: boolean },
    opts?: ListOptions,
  ): Promise<WishlistModel[]>;
  hasAccess(wishId: string, userId: number): Promise<boolean>;
  /** Какие из переданных ключей фото прикреплены к желаниям. */
  findAttachedImageKeys(keys: string[]): Promise<string[]>;
  listAllowedUserIds(wishId: string): Promise<number[]>;

  create(data: {
    name: string;
    price?: Prisma.Decimal;
    url?: string | null;
    description?: string | null;
    ownerId: number;
    orderedById?: number | null;
    status?: WishlistStatus;
    visibility?: WishVisibility;
    allowedUserIds?: number[];
    images?: WishImageModel[];
  }): Promise<WishlistModel>;

  update(
    id: string,
    data: {
      name?: string;
      price?: Prisma.Decimal | null;
      url?: string | null;
      description?: string | null;
      orderedById?: number | null;
      status?: WishlistStatus;
      visibility?: WishVisibility;
      allowedUserIds?: number[];
      /** Новый набор фото целиком (порядок = позиции); undefined — не трогать. */
      images?: WishImageModel[];
    },
  ): Promise<WishlistModel>;

  delete(id: string): Promise<void>;

  reserve(id: string, reserverUserId: number): Promise<WishlistModel>;
  unreserve(id: string, userId: number): Promise<WishlistModel>;
  markOrdered(id: string, userId: number): Promise<WishlistModel>;
  markFulfilled(id: string): Promise<WishlistModel>;
}
// Единый набор полей желания: фото подтягиваются в каждой выборке,
// иначе ответ после брони/правки внезапно терял бы картинки.
const WISH_SELECT = {
  id: true,
  name: true,
  url: true,
  price: true,
  description: true,
  ownerId: true,
  orderedById: true,
  status: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { username: true } },
  images: {
    select: { key: true, width: true, height: true },
    orderBy: { position: 'asc' },
  },
} satisfies Prisma.WishlistSelect;

type WishRow = Prisma.WishlistGetPayload<{ select: typeof WISH_SELECT }>;

function map(row: WishRow): WishlistModel {
  return {
    id: row.id,
    name: row.name,
    price: row.price ? String(row.price) : null,
    url: row.url ?? null,
    description: row.description ?? null,
    images: row.images,
    ownerId: row.ownerId,
    ownerName: row.owner.username ?? null,
    orderedById: row.orderedById ?? null,
    status: row.status,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Условие видимости чужого желания для просматривающего.
function visibleToViewerWhere(viewer: {
  viewerId: number;
  isFriend: boolean;
}): Prisma.WishlistWhereInput {
  const or: Prisma.WishlistWhereInput[] = [
    { visibility: 'PUBLIC' },
    { visibility: 'CUSTOM', accesses: { some: { userId: viewer.viewerId } } },
  ];
  if (viewer.isFriend) or.push({ visibility: 'FRIENDS' });
  return { OR: or };
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
      select: WISH_SELECT,
    });
    return row ? map(row) : null;
  }

  async findUniqueByOwnerNameUrl(
    ownerId: number,
    name: string,
    url?: string | null,
    description?: string | null,
  ): Promise<WishlistModel | null> {
    const row = await this.prisma.wishlist.findFirst({
      where: {
        ownerId,
        name,
        url: url ?? null,
        description: description ?? null,
      },
      select: WISH_SELECT,
    });
    return row ? map(row) : null;
  }

  async list(): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      orderBy: { createdAt: 'desc' },
      select: WISH_SELECT,
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
      select: WISH_SELECT,
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
      select: WISH_SELECT,
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
      select: WISH_SELECT,
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
      select: WISH_SELECT,
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

  async listVisibleByOwner(
    ownerId: number,
    viewer: { viewerId: number; isFriend: boolean },
    opts?: ListOptions,
  ): Promise<WishlistModel[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: {
        AND: [toWhere(ownerId, opts?.statuses), visibleToViewerWhere(viewer)],
      },
      orderBy: toOrderBy(opts?.orderBy, opts?.sort),
      take: opts?.take,
      skip: opts?.skip,
      select: WISH_SELECT,
    });
    return rows.map(map);
  }

  async findAttachedImageKeys(keys: string[]): Promise<string[]> {
    const attached: string[] = [];
    // пачками: огромный IN (...) Postgres не любит
    for (let i = 0; i < keys.length; i += 1000) {
      const rows = await this.prisma.wishImage.findMany({
        where: { key: { in: keys.slice(i, i + 1000) } },
        select: { key: true },
      });
      attached.push(...rows.map((r) => r.key));
    }
    return attached;
  }

  async hasAccess(wishId: string, userId: number): Promise<boolean> {
    const found = await this.prisma.wishAccess.findUnique({
      where: { wishId_userId: { wishId, userId } },
      select: { wishId: true },
    });
    return Boolean(found);
  }

  async listAllowedUserIds(wishId: string): Promise<number[]> {
    const rows = await this.prisma.wishAccess.findMany({
      where: { wishId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async create(data: {
    name: string;
    price?: Prisma.Decimal;
    url?: string | null;
    description?: string | null;
    ownerId: number;
    orderedById?: number | null;
    status?: WishlistStatus;
    visibility?: WishVisibility;
    allowedUserIds?: number[];
    images?: WishImageModel[];
  }): Promise<WishlistModel> {
    const row = await this.prisma.wishlist.create({
      select: WISH_SELECT,
      data: {
        name: data.name,
        price: data.price ?? undefined,
        url: data.url ?? null,
        description: data.description ?? null,
        ownerId: data.ownerId,
        orderedById: data.orderedById ?? null,
        status: data.status ?? 'OPEN',
        visibility: data.visibility ?? 'PUBLIC',
        ...(data.allowedUserIds?.length
          ? {
              accesses: {
                create: data.allowedUserIds.map((userId) => ({ userId })),
              },
            }
          : {}),
        ...(data.images?.length
          ? {
              images: {
                create: data.images.map((im, position) => ({
                  ...im,
                  position,
                })),
              },
            }
          : {}),
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
      description?: string | null;
      orderedById?: number | null;
      status?: WishlistStatus;
      visibility?: WishVisibility;
      allowedUserIds?: number[];
      images?: WishImageModel[];
    },
  ): Promise<WishlistModel> {
    // Фото пересоздаются целиком: удаление старых строк и вставка новых в
    // одной транзакции, чтобы уникальный key не конфликтовал сам с собой.
    const row = await this.prisma.$transaction(async (tx) => {
      if (data.images !== undefined) {
        await tx.wishImage.deleteMany({ where: { wishId: id } });
      }
      return tx.wishlist.update({
        where: { id },
        select: WISH_SELECT,
        data: {
          name: data.name ?? undefined,
          price: data.price === undefined ? undefined : data.price,
          url: data.url === undefined ? undefined : (data.url ?? null),
          description:
            data.description === undefined
              ? undefined
              : (data.description ?? null),
          orderedById:
            data.orderedById === undefined
              ? undefined
              : (data.orderedById ?? null),
          status: data.status ?? undefined,
          visibility: data.visibility ?? undefined,
          ...(data.allowedUserIds !== undefined
            ? {
                accesses: {
                  deleteMany: {},
                  create: data.allowedUserIds.map((userId) => ({ userId })),
                },
              }
            : {}),
          ...(data.images?.length
            ? {
                images: {
                  create: data.images.map((im, position) => ({
                    ...im,
                    position,
                  })),
                },
              }
            : {}),
        },
      });
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
    const row = await this.prisma.wishlist.findUnique({
      where: { id },
      select: WISH_SELECT,
    });
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
    const row = await this.prisma.wishlist.findUnique({
      where: { id },
      select: WISH_SELECT,
    });
    if (!row) throw new Error('unreserve: row not found after updateMany');
    return map(row);
  }

  async markOrdered(id: string, userId: number): Promise<WishlistModel> {
    const updatedFromReserved = await this.prisma.wishlist.updateMany({
      where: { id },
      data: { status: 'ORDERED', orderedById: userId },
    });

    if (updatedFromReserved.count === 0) {
      const updatedFromOpen = await this.prisma.wishlist.updateMany({
        where: { id },
        data: { status: 'ORDERED', orderedById: userId },
      });
      if (updatedFromOpen.count === 0) {
      }
    }

    const row = await this.prisma.wishlist.findUnique({
      where: { id },
      select: WISH_SELECT,
    });
    if (!row) throw new Error('markOrdered: row not found after updateMany');
    return map(row);
  }

  async markFulfilled(id: string): Promise<WishlistModel> {
    const res = await this.prisma.wishlist.updateMany({
      where: { id },
      data: { status: 'FULFILLED' },
    });
    if (res.count !== 1) {
    }
    const row = await this.prisma.wishlist.findUnique({
      where: { id },
      select: WISH_SELECT,
    });
    if (!row) throw new Error('markFulfilled: row not found after updateMany');
    return map(row);
  }
}
