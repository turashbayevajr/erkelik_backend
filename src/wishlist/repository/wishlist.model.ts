import { WishlistStatus, WishVisibility } from '@prisma/client';

export interface WishlistModel {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  description: string | null;
  ownerId: number;
  ownerName?: string | null;
  orderedById: number | null;
  status: WishlistStatus;
  visibility: WishVisibility;
  createdAt: Date;
  updatedAt: Date;
}
