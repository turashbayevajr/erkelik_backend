import { ConfigService } from '@nestjs/config';
import { Markup } from 'telegraf';
import { BotService } from './bot.service';
import type { BotContext } from './bot.types';
import type { WishlistModel } from 'src/wishlist/repository/wishlist.model';
import type { UserService } from 'src/users/service/users.service';
import type { WishlistsService } from 'src/wishlist/service/wishlist.service';
import type { SocialService } from 'src/social/service/social.service';
import type { MediaService } from 'src/media/service/media.service';

const wish = (keys: string[]): WishlistModel => ({
  id: 'w1',
  name: 'Wish',
  price: null,
  url: null,
  description: null,
  images: keys.map((key) => ({ key, width: 800, height: 1200 })),
  ownerId: 1,
  orderedById: null,
  status: 'OPEN',
  visibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const photoMsg = (fileId: string) => ({
  photo: [{ file_id: `${fileId}-s` }, { file_id: fileId }],
});

describe('BotService wish photos', () => {
  let bot: BotService;
  let media: { readAsJpeg: jest.Mock };
  let ctx: {
    reply: jest.Mock;
    replyWithPhoto: jest.Mock;
    replyWithMediaGroup: jest.Mock;
  };
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('x', 'menu')],
  ]);
  const show = (item: WishlistModel, text = 'text') =>
    (
      bot as unknown as {
        replyWish: (...a: unknown[]) => Promise<void>;
      }
    ).replyWish(ctx as unknown as BotContext, item, text, keyboard);

  beforeEach(() => {
    const config = {
      get: (k: string) => ({ BOT_TOKEN: '1:test', BOT_DISABLED: '1' })[k],
    } as unknown as ConfigService;
    media = { readAsJpeg: jest.fn().mockResolvedValue(Buffer.from('jpg')) };
    bot = new BotService(
      config,
      {} as UserService,
      {} as WishlistsService,
      {} as SocialService,
      media as unknown as MediaService,
    );
    ctx = {
      reply: jest.fn().mockResolvedValue({}),
      replyWithPhoto: jest.fn().mockResolvedValue(photoMsg('f1')),
      replyWithMediaGroup: jest
        .fn()
        .mockResolvedValue([photoMsg('g1'), photoMsg('g2')]),
    };
  });

  it('a wish without photos is plain text', async () => {
    await show(wish([]));
    expect(ctx.reply).toHaveBeenCalledWith(
      'text',
      expect.objectContaining(keyboard),
    );
    expect(ctx.replyWithPhoto).not.toHaveBeenCalled();
    expect(ctx.replyWithMediaGroup).not.toHaveBeenCalled();
  });

  it('one photo goes out with the text as caption and buttons', async () => {
    await show(wish(['a']));
    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(
      { source: Buffer.from('jpg'), filename: 'photo.jpg' },
      expect.objectContaining({ caption: 'text', ...keyboard }),
    );
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('several photos go out as an album, then text with buttons', async () => {
    await show(wish(['a', 'b']));
    const [album] = ctx.replyWithMediaGroup.mock.calls[0] as [
      { type: string; media: { filename: string } }[],
    ];
    expect(album.map((m) => [m.type, m.media.filename])).toEqual([
      ['photo', 'photo.jpg'],
      ['photo', 'photo.jpg'],
    ]);
    expect(ctx.reply).toHaveBeenCalledWith(
      'text',
      expect.objectContaining(keyboard),
    );
  });

  it('reuses Telegram file_id instead of uploading again', async () => {
    await show(wish(['a', 'b']));
    media.readAsJpeg.mockClear();
    await show(wish(['a', 'b']));
    expect(media.readAsJpeg).not.toHaveBeenCalled();
    expect(ctx.replyWithMediaGroup).toHaveBeenLastCalledWith([
      { type: 'photo', media: 'g1' },
      { type: 'photo', media: 'g2' },
    ]);
  });

  it('a long text does not fit a caption and is sent separately', async () => {
    await show(wish(['a']), 'x'.repeat(1500));
    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(expect.anything());
    expect(ctx.reply).toHaveBeenCalledWith('x'.repeat(1500), expect.anything());
  });

  it('still shows the wish when sending photos fails', async () => {
    ctx.replyWithMediaGroup.mockRejectedValue(new Error('400'));
    await show(wish(['a', 'b']));
    expect(ctx.reply).toHaveBeenCalledWith(
      'text',
      expect.objectContaining(keyboard),
    );
  });
});
