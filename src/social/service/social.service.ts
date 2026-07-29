import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Locale as PrismaLocale } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { normalizeLocale } from 'src/common/i18n';
import { t } from 'src/common/messages';
import { ISocialRepository } from '../repository/social.repository';
import {
  FriendModel,
  FriendRequestModel,
  SubscriberModel,
} from '../repository/social.model';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

export type FriendRequestOutcome = 'REQUESTED' | 'ACCEPTED';

@Injectable()
export class SocialService {
  constructor(
    @Inject('ISocialRepository')
    private readonly repo: ISocialRepository,
  ) {}

  private loc(l?: LocaleLike): CommonLocale {
    return normalizeLocale(l);
  }

  async subscribe(
    subscriberId: number,
    targetId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string }> {
    const loc = this.loc(responseLocale);
    if (subscriberId === targetId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, ''));
    }
    await this.repo.upsertSubscription(subscriberId, targetId);
    return { message: t('SUBSCRIBED_OK', loc, '') };
  }

  async unsubscribe(
    subscriberId: number,
    targetId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string }> {
    const loc = this.loc(responseLocale);
    await this.repo.deleteSubscription(subscriberId, targetId);
    return { message: t('UNSUBSCRIBED_OK', loc, '') };
  }

  async isSubscribed(subscriberId: number, targetId: number): Promise<boolean> {
    return this.repo.isSubscribed(subscriberId, targetId);
  }

  async listSubscribers(targetId: number): Promise<SubscriberModel[]> {
    return this.repo.listSubscribers(targetId);
  }

  async listSubscriptions(subscriberId: number): Promise<FriendModel[]> {
    return this.repo.listSubscriptions(subscriberId);
  }

  /**
   * Заявка в друзья. Встречная PENDING-заявка от адресата автоматически
   * принимается (оба хотят дружить — лишний шаг не нужен).
   */
  async requestFriend(
    requesterId: number,
    addresseeId: number,
    responseLocale?: LocaleLike,
  ): Promise<{
    message: string;
    outcome: FriendRequestOutcome;
    friendshipId: number;
  }> {
    const loc = this.loc(responseLocale);
    if (requesterId === addresseeId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, ''));
    }

    const existing = await this.repo.findFriendship(requesterId, addresseeId);
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException(t('ALREADY_EXISTS', loc, ''));
      }
      if (existing.requesterId === requesterId) {
        // Повторная своя заявка — идемпотентно.
        return {
          message: t('FRIEND_REQUESTED', loc, ''),
          outcome: 'REQUESTED',
          friendshipId: existing.id,
        };
      }
      await this.repo.acceptFriendship(existing.id);
      return {
        message: t('FRIEND_ACCEPTED', loc, ''),
        outcome: 'ACCEPTED',
        friendshipId: existing.id,
      };
    }

    const created = await this.repo.createFriendRequest(
      requesterId,
      addresseeId,
    );
    return {
      message: t('FRIEND_REQUESTED', loc, ''),
      outcome: 'REQUESTED',
      friendshipId: created.id,
    };
  }

  async acceptFriend(
    friendshipId: number,
    byUserId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string }> {
    const loc = this.loc(responseLocale);
    const found = await this.repo.findFriendshipById(friendshipId);
    if (!found) throw new NotFoundException(t('NOT_FOUND', loc, ''));
    if (found.addresseeId !== byUserId) {
      throw new ForbiddenException(t('FORBIDDEN', loc, ''));
    }
    if (found.status !== 'PENDING') {
      throw new ConflictException(t('STATUS_CONFLICT', loc, ''));
    }
    await this.repo.acceptFriendship(friendshipId);
    return { message: t('FRIEND_ACCEPTED', loc, '') };
  }

  async removeFriend(
    userId: number,
    otherId: number,
    responseLocale?: LocaleLike,
  ): Promise<{ message: string }> {
    const loc = this.loc(responseLocale);
    await this.repo.deleteFriendship(userId, otherId);
    return { message: t('FRIEND_REMOVED', loc, '') };
  }

  /** Состояние дружбы глазами userId — для /api/users/:username/wishes. */
  async friendshipBetween(
    userId: number,
    otherId: number,
  ): Promise<'NONE' | 'FRIENDS' | 'PENDING_OUT' | 'PENDING_IN'> {
    if (userId === otherId) return 'NONE';
    const found = await this.repo.findFriendship(userId, otherId);
    if (!found) return 'NONE';
    if (found.status === 'ACCEPTED') return 'FRIENDS';
    return found.requesterId === userId ? 'PENDING_OUT' : 'PENDING_IN';
  }

  async areFriends(a: number, b: number): Promise<boolean> {
    if (a === b) return false;
    return this.repo.areFriends(a, b);
  }

  async listFriends(userId: number): Promise<FriendModel[]> {
    return this.repo.listFriends(userId);
  }

  async listFriendIds(userId: number): Promise<number[]> {
    return this.repo.listFriendIds(userId);
  }

  async listIncomingRequests(userId: number): Promise<FriendRequestModel[]> {
    return this.repo.listIncomingRequests(userId);
  }
}
