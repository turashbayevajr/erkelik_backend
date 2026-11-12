import { EventEmitter2 } from '@nestjs/event-emitter';
import { WishlistsService } from './wishlist.service';
import { MediaService } from 'src/media/service/media.service';
import { SocialService } from 'src/social/service/social.service';
import { IWishlistRepository } from '../repository/wishlist.repository';
import { WishlistModel } from '../repository/wishlist.model';
import { WISH_CREATED } from '../wish-created.event';

const wish = (over: Partial<WishlistModel>): WishlistModel => ({
  id: 'w1',
  name: 'Wish',
  price: null,
  url: null,
  description: null,
  images: [],
  ownerId: 1,
  orderedById: null,
  status: 'OPEN',
  visibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('WishlistsService visibility', () => {
  let repo: jest.Mocked<
    Pick<
      IWishlistRepository,
      | 'listByOwner'
      | 'listVisibleByOwner'
      | 'hasAccess'
      | 'create'
      | 'findUniqueByOwnerNameUrl'
    >
  >;
  let social: { areFriends: jest.Mock };
  let events: EventEmitter2;
  let service: WishlistsService;

  beforeEach(() => {
    repo = {
      listByOwner: jest.fn().mockResolvedValue([]),
      listVisibleByOwner: jest.fn().mockResolvedValue([]),
      hasAccess: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
      findUniqueByOwnerNameUrl: jest.fn().mockResolvedValue(null),
    };
    social = { areFriends: jest.fn().mockResolvedValue(false) };
    events = new EventEmitter2();
    service = new WishlistsService(
      repo as unknown as IWishlistRepository,
      social as unknown as SocialService,
      events,
      new MediaService(),
    );
  });

  describe('listVisibleByOwner', () => {
    it('owner sees own list without visibility filter', async () => {
      await service.listVisibleByOwner(1, 1);
      expect(repo.listByOwner).toHaveBeenCalledWith(1, undefined);
      expect(repo.listVisibleByOwner).not.toHaveBeenCalled();
    });

    it('stranger goes through the filtered query as non-friend', async () => {
      social.areFriends.mockResolvedValue(false);
      await service.listVisibleByOwner(1, 2);
      expect(repo.listVisibleByOwner).toHaveBeenCalledWith(
        1,
        { viewerId: 2, isFriend: false },
        undefined,
      );
    });

    it('friend goes through the filtered query as friend', async () => {
      social.areFriends.mockResolvedValue(true);
      await service.listVisibleByOwner(1, 2);
      expect(repo.listVisibleByOwner).toHaveBeenCalledWith(
        1,
        { viewerId: 2, isFriend: true },
        undefined,
      );
    });
  });

  describe('canView', () => {
    it('owner always sees own wish', async () => {
      expect(await service.canView(wish({ visibility: 'CUSTOM' }), 1)).toBe(
        true,
      );
    });

    it('PUBLIC is visible to anyone', async () => {
      expect(await service.canView(wish({}), 99)).toBe(true);
    });

    it('FRIENDS is visible only to friends', async () => {
      const w = wish({ visibility: 'FRIENDS' });
      social.areFriends.mockResolvedValue(false);
      expect(await service.canView(w, 2)).toBe(false);
      social.areFriends.mockResolvedValue(true);
      expect(await service.canView(w, 2)).toBe(true);
    });

    it('CUSTOM is visible only to allowed users', async () => {
      const w = wish({ visibility: 'CUSTOM' });
      repo.hasAccess.mockResolvedValue(false);
      expect(await service.canView(w, 2)).toBe(false);
      repo.hasAccess.mockResolvedValue(true);
      expect(await service.canView(w, 2)).toBe(true);
      expect(repo.hasAccess).toHaveBeenCalledWith('w1', 2);
    });
  });

  describe('create', () => {
    it('passes visibility and allowed users to repo and emits wish.created', async () => {
      const created = wish({ visibility: 'CUSTOM' });
      repo.create.mockResolvedValue(created);
      const listener = jest.fn();
      events.on(WISH_CREATED, listener);

      await service.create({
        name: 'Wish',
        url: 'kaspi.kz/x',
        ownerId: 1,
        visibility: 'CUSTOM',
        allowedUserIds: [2, 3],
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'CUSTOM',
          allowedUserIds: [2, 3],
        }),
      );
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          wishId: 'w1',
          ownerId: 1,
          visibility: 'CUSTOM',
        }),
      );
    });
  });
});
