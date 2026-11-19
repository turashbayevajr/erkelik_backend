import { ApiWishesController } from './api-wishes.controller';
import type { WishlistsService } from '../service/wishlist.service';
import type { UserService } from 'src/users/service/users.service';
import type { SocialService } from 'src/social/service/social.service';
import type { UserModel } from 'src/users/repository/users.model';
import type { WishlistModel } from '../repository/wishlist.model';

const wish = (over: Partial<WishlistModel>): WishlistModel => ({
  id: 'w1',
  name: 'Плед',
  price: null,
  url: null,
  description: null,
  images: [],
  ownerId: 2,
  ownerName: 'dana',
  ownerFirstName: 'Дана',
  orderedById: 1,
  status: 'RESERVED',
  visibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('GET /api/reservations', () => {
  const me = { id: 1, preferredLocale: 'RU' } as UserModel;
  let listReservedByUser: jest.Mock;
  let controller: ApiWishesController;

  beforeEach(() => {
    listReservedByUser = jest.fn();
    controller = new ApiWishesController(
      { listReservedByUser } as unknown as WishlistsService,
      {} as UserService,
      {} as SocialService,
    );
  });

  it('returns my reservations with whose wish it is', async () => {
    listReservedByUser.mockResolvedValue([wish({})]);
    const [r] = await controller.myReservations(me);
    expect(r).toMatchObject({
      id: 'w1',
      status: 'RESERVED',
      reservedByMe: true,
      owner: { id: 2, username: 'dana', firstName: 'Дана' },
    });
    expect(listReservedByUser).toHaveBeenCalledWith(1, expect.anything());
  });

  it('skips my own wishes marked as reserved by myself', async () => {
    listReservedByUser.mockResolvedValue([
      wish({ id: 'mine', ownerId: 1 }),
      wish({ id: 'gift' }),
    ]);
    const list = await controller.myReservations(me);
    expect(list.map((w) => w.id)).toEqual(['gift']);
  });

  it('never exposes who else is involved — only my own flag', async () => {
    listReservedByUser.mockResolvedValue([wish({})]);
    const [r] = await controller.myReservations(me);
    expect(r).not.toHaveProperty('orderedById');
  });
});
