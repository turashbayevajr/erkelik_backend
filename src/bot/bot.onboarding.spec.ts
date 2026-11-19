import { ConfigService } from '@nestjs/config';
import { Telegram } from 'telegraf';
import type { Telegraf } from 'telegraf';
import type { Update } from 'telegraf/types';
import { BotService } from './bot.service';
import type { BotContext } from './bot.types';
import { UI } from './bot.i18n';
import type { UserService } from 'src/users/service/users.service';
import type { WishlistsService } from 'src/wishlist/service/wishlist.service';
import type { SocialService } from 'src/social/service/social.service';
import type { MediaService } from 'src/media/service/media.service';

type Call = { method: string; payload: Record<string, unknown> };

const from = (username?: string) => ({
  id: 42,
  is_bot: false,
  first_name: 'Aru',
  language_code: 'ru',
  ...(username ? { username } : {}),
});

let updateId = 0;
const command = (text: string, username?: string): Update =>
  ({
    update_id: ++updateId,
    message: {
      message_id: updateId,
      date: 0,
      chat: { id: 42, type: 'private', first_name: 'Aru' },
      from: from(username),
      text,
      entities: [
        { type: 'bot_command', offset: 0, length: text.split(' ')[0].length },
      ],
    },
  }) as unknown as Update;

describe('BotService onboarding', () => {
  let calls: Call[];
  let users: {
    registerOrUpdateByTelegramId: jest.Mock;
    findByUsername: jest.Mock;
  };
  let wishes: { listVisibleByOwner: jest.Mock };
  let svc: BotService;
  let telegraf: Telegraf<BotContext>;
  const sent = () =>
    calls.filter((c) => c.method === 'sendMessage').map((c) => c.payload);
  const buttons = (p: Record<string, unknown>) =>
    (
      (p.reply_markup as { inline_keyboard?: Record<string, unknown>[][] })
        ?.inline_keyboard ?? []
    ).flat();

  beforeEach(() => {
    calls = [];
    const env: Record<string, string> = {
      BOT_TOKEN: '1:test',
      BOT_DISABLED: '1',
      WEBAPP_URL: 'https://app.example.kz/',
    };
    users = {
      registerOrUpdateByTelegramId: jest.fn().mockResolvedValue({
        data: { id: 1, preferredLocale: 'RU' },
      }),
      findByUsername: jest
        .fn()
        .mockResolvedValue({ id: 2, username: 'dana_test' }),
    };
    wishes = {
      listVisibleByOwner: jest
        .fn()
        .mockResolvedValue([{ id: 'w1', name: 'Плед' }]),
    };
    svc = new BotService(
      { get: (k: string) => env[k] } as unknown as ConfigService,
      users as unknown as UserService,
      wishes as unknown as WishlistsService,
      {
        isSubscribed: jest.fn().mockResolvedValue(false),
        areFriends: jest.fn().mockResolvedValue(false),
      } as unknown as SocialService,
      {} as MediaService,
    );
    telegraf = (svc as unknown as { bot: Telegraf<BotContext> }).bot;
    telegraf.botInfo = {
      id: 1,
      is_bot: true,
      first_name: 'Erkelik',
      username: 'erkelik_bot',
    } as Telegraf<BotContext>['botInfo'];
    // Telegraf создаёт клиент API на каждый апдейт — подменяем прототип,
    // чтобы тест не ходил в настоящий Telegram.
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(((
      method: string,
      payload: Record<string, unknown>,
    ) => {
      calls.push({ method, payload });
      if (method === 'getMe') return Promise.resolve(telegraf.botInfo);
      return Promise.resolve({ message_id: 1, chat: { id: 42 }, date: 0 });
    }) as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('/start explains the product and offers to open the mini app', async () => {
    await telegraf.handleUpdate(command('/start'));
    const [intro, menu] = sent();
    expect(intro.text).toContain('Erkelik');
    const open = buttons(menu).find((b) => b.web_app);
    expect(open).toMatchObject({
      text: UI.RU.buttons.openApp,
      web_app: { url: 'https://app.example.kz/' },
    });
    expect(buttons(menu).map((b) => b.callback_data)).toEqual(
      expect.arrayContaining(['share', 'help']),
    );
  });

  it('an invite link opens the friend wishlist with an app button', async () => {
    await telegraf.handleUpdate(command('/start dana_test', 'aru'));
    expect(users.findByUsername).toHaveBeenCalledWith('dana_test');
    const [title] = sent();
    expect(buttons(title).find((b) => b.web_app)).toMatchObject({
      web_app: { url: 'https://app.example.kz/?friend=dana_test' },
    });
  });

  it('own invite link shows the normal welcome', async () => {
    await telegraf.handleUpdate(command('/start Aru', 'aru'));
    expect(users.findByUsername).not.toHaveBeenCalled();
  });

  it('/share gives a personal invite link', async () => {
    await telegraf.handleUpdate(command('/share', 'aru'));
    const [msg] = sent();
    expect(msg.text).toContain('https://t\\.me/erkelik\\_bot?start\\=aru');
    const send = buttons(msg).find((b) => b.url);
    expect(String(send?.url)).toContain(
      encodeURIComponent('https://t.me/erkelik_bot?start=aru'),
    );
  });

  it('/share without a Telegram username explains what to do', async () => {
    await telegraf.handleUpdate(command('/share'));
    expect(sent()[0].text).toContain('username');
  });

  it('sets commands, descriptions and the menu button in three languages', async () => {
    await (
      svc as unknown as { configureBotProfile: () => Promise<void> }
    ).configureBotProfile();
    const byMethod = (m: string) => calls.filter((c) => c.method === m);
    expect(
      byMethod('setMyCommands').map((c) => c.payload.language_code),
    ).toEqual([undefined, 'ru', 'kk']);
    expect(byMethod('setMyDescription')).toHaveLength(3);
    expect(byMethod('setMyShortDescription')).toHaveLength(3);
    expect(byMethod('setChatMenuButton')[0].payload.menu_button).toMatchObject({
      type: 'web_app',
      web_app: { url: 'https://app.example.kz/' },
    });
  });
});
