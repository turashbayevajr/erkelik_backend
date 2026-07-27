import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FriendModel,
  FriendRequestModel,
  FriendshipModel,
  SubscriberModel,
} from './social.model';

export interface ISocialRepository {
  upsertSubscription(subscriberId: number, targetId: number): Promise<void>;
  deleteSubscription(subscriberId: number, targetId: number): Promise<void>;
  isSubscribed(subscriberId: number, targetId: number): Promise<boolean>;
  listSubscribers(targetId: number): Promise<SubscriberModel[]>;

  findFriendship(a: number, b: number): Promise<FriendshipModel | null>;
  findFriendshipById(id: number): Promise<FriendshipModel | null>;
  createFriendRequest(
    requesterId: number,
    addresseeId: number,
  ): Promise<FriendshipModel>;
  acceptFriendship(id: number): Promise<FriendshipModel>;
  deleteFriendship(a: number, b: number): Promise<void>;
  areFriends(a: number, b: number): Promise<boolean>;
  listFriends(userId: number): Promise<FriendModel[]>;
  listFriendIds(userId: number): Promise<number[]>;
  listIncomingRequests(userId: number): Promise<FriendRequestModel[]>;
}

@Injectable()
export class SocialRepository implements ISocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSubscription(
    subscriberId: number,
    targetId: number,
  ): Promise<void> {
    await this.prisma.subscription.upsert({
      where: { subscriberId_targetId: { subscriberId, targetId } },
      update: {},
      create: { subscriberId, targetId },
    });
  }

  async deleteSubscription(
    subscriberId: number,
    targetId: number,
  ): Promise<void> {
    await this.prisma.subscription.deleteMany({
      where: { subscriberId, targetId },
    });
  }

  async isSubscribed(subscriberId: number, targetId: number): Promise<boolean> {
    const found = await this.prisma.subscription.findUnique({
      where: { subscriberId_targetId: { subscriberId, targetId } },
      select: { id: true },
    });
    return Boolean(found);
  }

  async listSubscribers(targetId: number): Promise<SubscriberModel[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { targetId },
      select: {
        subscriber: {
          select: { id: true, telegramId: true, preferredLocale: true },
        },
      },
    });
    return rows.map((r) => ({
      userId: r.subscriber.id,
      telegramId: r.subscriber.telegramId,
      preferredLocale: r.subscriber.preferredLocale,
    }));
  }

  async findFriendship(a: number, b: number): Promise<FriendshipModel | null> {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
  }

  async findFriendshipById(id: number): Promise<FriendshipModel | null> {
    return this.prisma.friendship.findUnique({
      where: { id },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
  }

  async createFriendRequest(
    requesterId: number,
    addresseeId: number,
  ): Promise<FriendshipModel> {
    return this.prisma.friendship.create({
      data: { requesterId, addresseeId },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
  }

  async acceptFriendship(id: number): Promise<FriendshipModel> {
    return this.prisma.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });
  }

  async deleteFriendship(a: number, b: number): Promise<void> {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  }

  async areFriends(a: number, b: number): Promise<boolean> {
    const found = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
      select: { id: true },
    });
    return Boolean(found);
  }

  async listFriends(userId: number): Promise<FriendModel[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: {
        requester: { select: { id: true, username: true, firstName: true } },
        addressee: { select: { id: true, username: true, firstName: true } },
      },
    });
    return rows.map((r) => {
      const other = r.requester.id === userId ? r.addressee : r.requester;
      return {
        userId: other.id,
        username: other.username,
        firstName: other.firstName,
      };
    });
  }

  async listFriendIds(userId: number): Promise<number[]> {
    const friends = await this.listFriends(userId);
    return friends.map((f) => f.userId);
  }

  async listIncomingRequests(userId: number): Promise<FriendRequestModel[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      select: {
        id: true,
        requester: { select: { id: true, username: true, firstName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      friendshipId: r.id,
      requesterId: r.requester.id,
      requesterUsername: r.requester.username,
      requesterFirstName: r.requester.firstName,
    }));
  }
}
