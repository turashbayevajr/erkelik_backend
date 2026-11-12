import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WishlistsService } from './wishlist.service';
import { SocialService } from 'src/social/service/social.service';
import { MediaService } from 'src/media/service/media.service';
import { IWishlistRepository } from '../repository/wishlist.repository';
import { WishImageModel, WishlistModel } from '../repository/wishlist.model';

const KEY_A = '1-11111111-1111-4111-8111-111111111111.webp';
const KEY_B = '1-22222222-2222-4222-8222-222222222222.webp';
const FOREIGN = '2-33333333-3333-4333-8333-333333333333.webp';

const img = (key: string): WishImageModel => ({
  key,
  width: 800,
  height: 1200,
});

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

describe('WishlistsService photos', () => {
  let repo: jest.Mocked<
    Pick<
      IWishlistRepository,
      'create' | 'update' | 'delete' | 'findById' | 'findUniqueByOwnerNameUrl'
    >
  >;
  let media: MediaService;
  let removeSpy: jest.SpyInstance;
  let service: WishlistsService;

  beforeEach(() => {
    repo = {
      create: jest.fn().mockImplementation((d) => Promise.resolve(wish(d))),
      update: jest
        .fn()
        .mockImplementation((_id, d) => Promise.resolve(wish(d))),
      delete: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findUniqueByOwnerNameUrl: jest.fn().mockResolvedValue(null),
    };
    media = new MediaService();
    // файлов на диске нет — размеры отдаём из «хранилища» мока
    jest
      .spyOn(media, 'describe')
      .mockImplementation((key) => Promise.resolve(img(key)));
    removeSpy = jest.spyOn(media, 'remove').mockResolvedValue(undefined);
    service = new WishlistsService(
      repo as unknown as IWishlistRepository,
      { areFriends: jest.fn() } as unknown as SocialService,
      new EventEmitter2(),
      media,
    );
  });

  describe('create: фото или ссылка', () => {
    it('rejects a wish with neither photo nor link', async () => {
      await expect(
        service.create({ name: 'Подарок', ownerId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a blank link and an empty photo list', async () => {
      await expect(
        service.create({
          name: 'Подарок',
          ownerId: 1,
          url: '  ',
          imageKeys: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a link without photos', async () => {
      await service.create({ name: 'Подарок', ownerId: 1, url: 'kaspi.kz/x' });
      expect(repo.create).toHaveBeenCalled();
    });

    it('accepts photos without a link, keeping their order', async () => {
      await service.create({
        name: 'Подарок',
        ownerId: 1,
        imageKeys: [KEY_B, KEY_A],
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ images: [img(KEY_B), img(KEY_A)] }),
      );
    });

    it("rejects someone else's photo key", async () => {
      await expect(
        service.create({ name: 'Подарок', ownerId: 1, imageKeys: [FOREIGN] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a key whose file does not exist', async () => {
      jest.spyOn(media, 'describe').mockResolvedValue(null);
      await expect(
        service.create({ name: 'Подарок', ownerId: 1, imageKeys: [KEY_A] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects more than 8 photos', async () => {
      const keys = Array.from(
        { length: 9 },
        (_, i) => `1-${String(i).repeat(8)}-1111-4111-8111-111111111111.webp`,
      );
      await expect(
        service.create({ name: 'Подарок', ownerId: 1, imageKeys: keys }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('refuses to remove the last photo when there is no link', async () => {
      repo.findById.mockResolvedValue(wish({ images: [img(KEY_A)] }));
      await expect(
        service.update('w1', { imageKeys: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('refuses to clear the link when there are no photos', async () => {
      repo.findById.mockResolvedValue(wish({ url: 'kaspi.kz/x' }));
      await expect(
        service.update('w1', { url: null as never }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows clearing the link when photos remain', async () => {
      repo.findById.mockResolvedValue(
        wish({ url: 'kaspi.kz/x', images: [img(KEY_A)] }),
      );
      await service.update('w1', { url: null as never });
      expect(repo.update).toHaveBeenCalled();
    });

    it('keeps old wishes without photo and link editable by name', async () => {
      repo.findById.mockResolvedValue(wish({}));
      await service.update('w1', { name: 'Новое имя', url: null as never });
      expect(repo.update).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({ name: 'Новое имя', images: undefined }),
      );
    });

    it('deletes files of photos dropped from the wish', async () => {
      repo.findById.mockResolvedValue(
        wish({ images: [img(KEY_A), img(KEY_B)] }),
      );
      await service.update('w1', { imageKeys: [KEY_B] });
      expect(repo.update).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({ images: [img(KEY_B)] }),
      );
      expect(removeSpy).toHaveBeenCalledWith([KEY_A]);
    });

    it('does not touch photos when imageKeys is not passed', async () => {
      repo.findById.mockResolvedValue(wish({ images: [img(KEY_A)] }));
      await service.update('w1', { name: 'Другое' });
      expect(repo.update).toHaveBeenCalledWith(
        'w1',
        expect.objectContaining({ images: undefined }),
      );
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  it('remove deletes the photo files with the wish', async () => {
    repo.findById.mockResolvedValue(wish({ images: [img(KEY_A)] }));
    await service.remove('w1', 'RU', 1);
    expect(repo.delete).toHaveBeenCalledWith('w1');
    expect(removeSpy).toHaveBeenCalledWith([KEY_A]);
  });
});
