import { WishlistStatus, WishVisibility } from '@prisma/client';

export interface WishImageModel {
  key: string;
  width: number;
  height: number;
}

export interface WishlistModel {
  id: string;
  name: string;
  price: string | null;
  url: string | null;
  description: string | null;
  /** Фото по порядку; первое — обложка. */
  images: WishImageModel[];
  ownerId: number;
  ownerName?: string | null;
  orderedById: number | null;
  status: WishlistStatus;
  visibility: WishVisibility;
  createdAt: Date;
  updatedAt: Date;
}
