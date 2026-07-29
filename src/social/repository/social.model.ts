import type { FriendshipStatus, Locale } from '@prisma/client';

export interface SubscriberModel {
  userId: number;
  telegramId: bigint;
  preferredLocale: Locale;
  username: string | null;
  firstName: string | null;
}

export interface FriendModel {
  userId: number;
  username: string | null;
  firstName: string | null;
}

export interface FriendshipModel {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: FriendshipStatus;
}

export interface FriendRequestModel {
  friendshipId: number;
  requesterId: number;
  requesterUsername: string | null;
  requesterFirstName: string | null;
}
