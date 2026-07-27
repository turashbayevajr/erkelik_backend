import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WishlistStatus } from '@prisma/client';

type WishlistStatusCount = {
  [key in WishlistStatus]: number;
};

export interface AnalyticsData {
  totalUsers: number;
  wishlistCountsByStatus: WishlistStatusCount;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalyticsData(): Promise<AnalyticsData> {
    const totalUsers = await this.prisma.user.count();

    const wishlistGroups = await this.prisma.wishlist.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const initialCounts: WishlistStatusCount = {
      OPEN: 0,
      RESERVED: 0,
      ORDERED: 0,
      FULFILLED: 0,
    };

    const wishlistCountsByStatus = wishlistGroups.reduce((acc, group) => {
      acc[group.status] = group._count.id;
      return acc;
    }, initialCounts);

    return {
      totalUsers,
      wishlistCountsByStatus,
    };
  }
}
