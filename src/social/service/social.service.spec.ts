/* eslint-disable @typescript-eslint/require-await -- in-memory фейк репозитория */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { SocialService } from './social.service';
import { ISocialRepository } from '../repository/social.repository';
import {
  FriendModel,
  FriendRequestModel,
  FriendshipModel,
  SubscriberModel,
} from '../repository/social.model';

class FakeSocialRepo implements ISocialRepository {
  subs = new Set<string>();
  friendships: FriendshipModel[] = [];
  private nextId = 1;

  async upsertSubscription(s: number, t: number): Promise<void> {
    this.subs.add(`${s}:${t}`);
  }
  async deleteSubscription(s: number, t: number): Promise<void> {
    this.subs.delete(`${s}:${t}`);
  }
  async isSubscribed(s: number, t: number): Promise<boolean> {
    return this.subs.has(`${s}:${t}`);
  }
  async listSubscribers(targetId: number): Promise<SubscriberModel[]> {
    return [...this.subs]
      .filter((k) => k.endsWith(`:${targetId}`))
      .map((k) => ({
        userId: Number(k.split(':')[0]),
        telegramId: BigInt(k.split(':')[0]),
        preferredLocale: 'EN' as const,
        username: null,
        firstName: null,
      }));
  }
  async findFriendship(a: number, b: number): Promise<FriendshipModel | null> {
    return (
      this.friendships.find(
        (f) =>
          (f.requesterId === a && f.addresseeId === b) ||
          (f.requesterId === b && f.addresseeId === a),
      ) ?? null
    );
  }
  async findFriendshipById(id: number): Promise<FriendshipModel | null> {
    return this.friendships.find((f) => f.id === id) ?? null;
  }
  async createFriendRequest(
    requesterId: number,
    addresseeId: number,
  ): Promise<FriendshipModel> {
    const f: FriendshipModel = {
      id: this.nextId++,
      requesterId,
      addresseeId,
      status: 'PENDING',
    };
    this.friendships.push(f);
    return f;
  }
  async acceptFriendship(id: number): Promise<FriendshipModel> {
    const f = this.friendships.find((x) => x.id === id)!;
    f.status = 'ACCEPTED';
    return f;
  }
  async deleteFriendship(a: number, b: number): Promise<void> {
    this.friendships = this.friendships.filter(
      (f) =>
        !(
          (f.requesterId === a && f.addresseeId === b) ||
          (f.requesterId === b && f.addresseeId === a)
        ),
    );
  }
  async areFriends(a: number, b: number): Promise<boolean> {
    const f = await this.findFriendship(a, b);
    return f?.status === 'ACCEPTED';
  }
  async listFriends(): Promise<FriendModel[]> {
    return [];
  }
  async listFriendIds(userId: number): Promise<number[]> {
    return this.friendships
      .filter(
        (f) =>
          f.status === 'ACCEPTED' &&
          (f.requesterId === userId || f.addresseeId === userId),
      )
      .map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
  }
  async listIncomingRequests(userId: number): Promise<FriendRequestModel[]> {
    return this.friendships
      .filter((f) => f.addresseeId === userId && f.status === 'PENDING')
      .map((f) => ({
        friendshipId: f.id,
        requesterId: f.requesterId,
        requesterUsername: null,
        requesterFirstName: null,
      }));
  }
}

describe('SocialService', () => {
  let repo: FakeSocialRepo;
  let service: SocialService;

  beforeEach(() => {
    repo = new FakeSocialRepo();
    service = new SocialService(repo);
  });

  describe('subscriptions', () => {
    it('subscribes and lists subscribers', async () => {
      await service.subscribe(1, 2);
      await service.subscribe(3, 2);
      const subs = await service.listSubscribers(2);
      expect(subs.map((s) => s.userId).sort()).toEqual([1, 3]);
    });

    it('is idempotent on duplicate subscribe', async () => {
      await service.subscribe(1, 2);
      await expect(service.subscribe(1, 2)).resolves.toBeDefined();
      expect(repo.subs.size).toBe(1);
    });

    it('forbids self-subscription', async () => {
      await expect(service.subscribe(1, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('unsubscribe is idempotent', async () => {
      await service.subscribe(1, 2);
      await service.unsubscribe(1, 2);
      await expect(service.unsubscribe(1, 2)).resolves.toBeDefined();
      expect(await service.isSubscribed(1, 2)).toBe(false);
    });
  });

  describe('friendship', () => {
    it('creates a pending request', async () => {
      const res = await service.requestFriend(1, 2);
      expect(res.outcome).toBe('REQUESTED');
      expect(await service.areFriends(1, 2)).toBe(false);
    });

    it('auto-accepts a mutual request', async () => {
      await service.requestFriend(1, 2);
      const res = await service.requestFriend(2, 1);
      expect(res.outcome).toBe('ACCEPTED');
      expect(await service.areFriends(1, 2)).toBe(true);
      expect(await service.areFriends(2, 1)).toBe(true);
    });

    it('repeated own request is idempotent', async () => {
      await service.requestFriend(1, 2);
      const res = await service.requestFriend(1, 2);
      expect(res.outcome).toBe('REQUESTED');
      expect(repo.friendships).toHaveLength(1);
    });

    it('rejects request when already friends', async () => {
      await service.requestFriend(1, 2);
      await service.requestFriend(2, 1);
      await expect(service.requestFriend(1, 2)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('forbids self-request', async () => {
      await expect(service.requestFriend(1, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('accept is allowed only for the addressee', async () => {
      await service.requestFriend(1, 2);
      const [{ friendshipId }] = await service.listIncomingRequests(2);
      await expect(
        service.acceptFriend(friendshipId, 1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await service.acceptFriend(friendshipId, 2);
      expect(await service.areFriends(1, 2)).toBe(true);
    });

    it('accept of already accepted request conflicts', async () => {
      await service.requestFriend(1, 2);
      const [{ friendshipId }] = await service.listIncomingRequests(2);
      await service.acceptFriend(friendshipId, 2);
      await expect(
        service.acceptFriend(friendshipId, 2),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('removeFriend deletes in both directions', async () => {
      await service.requestFriend(1, 2);
      await service.requestFriend(2, 1);
      await service.removeFriend(2, 1);
      expect(await service.areFriends(1, 2)).toBe(false);
      expect(repo.friendships).toHaveLength(0);
    });

    it('areFriends is false for self', async () => {
      expect(await service.areFriends(5, 5)).toBe(false);
    });
  });
});
