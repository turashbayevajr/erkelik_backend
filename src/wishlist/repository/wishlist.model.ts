import { WishlistStatus } from '@prisma/client';

export interface WishlistModel {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  ownerId: number;
  orderedById: number | null;
  status: WishlistStatus;
  createdAt: Date;
  updatedAt: Date;
}
