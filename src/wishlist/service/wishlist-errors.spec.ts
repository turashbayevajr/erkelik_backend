import { Logger } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WishlistsService } from './wishlist.service';
import { MediaService } from 'src/media/service/media.service';
import { SocialService } from 'src/social/service/social.service';
import { IWishlistRepository } from '../repository/wishlist.repository';

describe('WishlistsService error handling', () => {
  let repo: jest.Mocked<
    Pick<IWishlistRepository, 'create' | 'findUniqueByOwnerNameUrl'>
  >;
  let service: WishlistsService;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findUniqueByOwnerNameUrl: jest.fn().mockResolvedValue(null),
    };
    service = new WishlistsService(
      repo as unknown as IWishlistRepository,
      { areFriends: jest.fn() } as unknown as SocialService,
      new EventEmitter2(),
      new MediaService(),
    );
  });

  // Цена >= 10^10 роняла numeric(12,2) ошибкой Postgres без кода Prisma,
  // и пользователь видел «непредвиденную ошибку» вместо понятного текста.
  it('rejects an out-of-range price before touching the repository', async () => {
    await expect(
      service.create({
        name: 'Яхта',
        price: '9999999999999',
        ownerId: 1,
        url: 'kaspi.kz/x',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('allows the largest storable price', async () => {
    repo.create.mockResolvedValue({
      id: 'w1',
      ownerId: 1,
      url: 'kaspi.kz/x',
    } as never);
    await expect(
      service.create({
        name: 'Яхта',
        price: '9999999999.99',
        ownerId: 1,
        url: 'kaspi.kz/x',
      } as never),
    ).resolves.toMatchObject({ data: { id: 'w1' } });
  });

  it('logs the original error instead of losing it behind UNEXPECTED', async () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    repo.create.mockRejectedValue(new Error('numeric field overflow'));

    await expect(
      service.create({
        name: 'Подарок',
        ownerId: 1,
        url: 'kaspi.kz/x',
      } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('create(ownerId=1)'),
      expect.stringContaining('numeric field overflow'),
    );
    spy.mockRestore();
  });

  it('still maps P2002 to a conflict', async () => {
    repo.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    await expect(
      service.create({
        name: 'Подарок',
        ownerId: 1,
        url: 'kaspi.kz/x',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
