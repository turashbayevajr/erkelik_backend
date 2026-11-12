import { EventEmitter2 } from '@nestjs/event-emitter';
import { WishlistsService } from './wishlist.service';
import { MediaService } from 'src/media/service/media.service';
import { SocialService } from 'src/social/service/social.service';
import { IWishlistRepository } from '../repository/wishlist.repository';
import { WishlistModel } from '../repository/wishlist.model';
import { WISH_UPDATED, WishUpdatedEvent } from '../wish-updated.event';

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

describe('WishlistsService update -> wish.updated', () => {
  let repo: jest.Mocked<
    Pick<
      IWishlistRepository,
      'findById' | 'update' | 'findUniqueByOwnerNameUrl'
    >
  >;
  let events: EventEmitter2;
  let service: WishlistsService;
  let emitted: WishUpdatedEvent[];

  const setup = (found: WishlistModel) => {
    repo.findById.mockResolvedValue(found);
    repo.update.mockImplementation((_id, patch) =>
      Promise.resolve(wish({ ...found, ...(patch as object) })),
    );
  };

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
      findUniqueByOwnerNameUrl: jest.fn().mockResolvedValue(null),
    };
    events = new EventEmitter2();
    emitted = [];
    events.on(WISH_UPDATED, (e: WishUpdatedEvent) => emitted.push(e));
    service = new WishlistsService(
      repo as unknown as IWishlistRepository,
      { areFriends: jest.fn() } as unknown as SocialService,
      events,
      new MediaService(),
    );
  });

  it('emits for a RESERVED wish when the name changes', async () => {
    setup(wish({ status: 'RESERVED', orderedById: 2 }));
    await service.update('w1', { name: 'New name' });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      wishId: 'w1',
      ownerId: 1,
      name: 'New name',
      reserverUserId: 2,
    });
  });

  it('emits for an ORDERED wish when the description changes', async () => {
    setup(wish({ status: 'ORDERED', orderedById: 2 }));
    await service.update('w1', { description: 'now in blue' });
    expect(emitted).toHaveLength(1);
  });

  it('does not emit for an OPEN wish', async () => {
    setup(wish({ status: 'OPEN' }));
    await service.update('w1', { name: 'New name' });
    expect(emitted).toHaveLength(0);
  });

  it('does not emit when nothing meaningful changed', async () => {
    setup(wish({ status: 'RESERVED', orderedById: 2, name: 'Same' }));
    await service.update('w1', { name: 'Same', visibility: 'FRIENDS' });
    expect(emitted).toHaveLength(0);
  });

  it('does not emit when the owner reserved their own wish', async () => {
    setup(wish({ status: 'RESERVED', orderedById: 1 }));
    await service.update('w1', { name: 'New name' });
    expect(emitted).toHaveLength(0);
  });
});
