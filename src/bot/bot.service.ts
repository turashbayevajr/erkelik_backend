import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Markup, Telegraf, session } from 'telegraf';
import type { BotContext } from './bot.types';
import {
  EDIT_FIELD_RE,
  EDIT_MENU_RE,
  EDIT_PHOTOS_RE,
  PHOTOS_CLEAR_RE,
} from './bot.callbacks';
import type { InputFile, PhotoSize } from 'telegraf/types';
import { UI, UILang } from './bot.i18n';
import { localeFromLanguageCode } from 'src/common/i18n';
import { isPriceWithinRange } from 'src/common/price';

import { WishlistModel } from 'src/wishlist/repository/wishlist.model';
import { UserService } from 'src/users/service/users.service';
import { WishlistsService } from 'src/wishlist/service/wishlist.service';
import { SocialService } from 'src/social/service/social.service';
import {
  MAX_UPLOAD_BYTES,
  MediaService,
} from 'src/media/service/media.service';
import { MAX_WISH_IMAGES } from 'src/wishlist/wish-images';
import { WishlistStatus } from '@prisma/client';

// ---------- utils ----------

/** Лимит подписи к фото в Telegram. */
const TG_CAPTION_LIMIT = 1024;
const TG_FILE_ID_CACHE_LIMIT = 5000;

const ESCAPE_CHARS = /[_*[\]()~`>#+\-=|{}.!\\]/g;
function escapeMarkdownV2(text: string): string {
  return String(text).replace(ESCAPE_CHARS, (m) => '\\' + m);
}
function isValidUsername(raw: string): boolean {
  const u = raw.trim().replace(/^@/, '');
  return /^[A-Za-z0-9_]{5,32}$/.test(u);
}
function normalizePriceInput(raw: string): string | null {
  const s = raw.replace(',', '.').trim();
  if (!s) return null;
  const n = Number(s);
  if (!isFinite(n) || n < 0) return null;
  // Больше MAX_PRICE колонка numeric(12,2) не принимает — отсекаем сразу,
  // иначе диалог дошёл бы до сохранения и упал там.
  if (!isPriceWithinRange(n)) return null;
  return n.toString();
}
function resolveUILang(ctx: BotContext): UILang {
  // cached session locale if exists
  if (ctx.session?.me?.locale) return ctx.session.me.locale;
  const lc = (ctx.from as any)?.language_code?.toString();
  return localeFromLanguageCode(lc) ?? 'EN';
}

function buildMainMenu(lang: UILang) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [Markup.button.callback(B.add, 'add')],
    [Markup.button.callback(B.viewMine, 'view')],
    [Markup.button.callback(B.viewOthers, 'view_others')],
    [Markup.button.callback(B.viewMyReservations, 'view_reservations')],
    [
      Markup.button.callback(B.friendsList, 'friends'),
      Markup.button.callback(B.subscriptionsList, 'subscriptions'),
    ],
  ]);
}

// Строка списка «человек»: имя + @username, ничего лишнего.
function personLine(p: {
  username: string | null;
  firstName: string | null;
}): string {
  const name = p.firstName ?? p.username ?? '—';
  return p.username ? `• ${name} (@${p.username})` : `• ${name}`;
}

function itemButtonsMine(lang: UILang, id: string) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(B.edit, `edit_${id}`),
      Markup.button.callback(B.delete, `delete_${id}`),
    ],
    [Markup.button.callback(B.fullfilled, `fulfilled_${id}`)],
    [Markup.button.callback(B.menu, 'menu')],
  ]);
}
function itemButtonsMineDynamic(lang: UILang, item: WishlistModel) {
  const B = UI[lang].buttons;

  if (item.status === 'ORDERED') {
    return Markup.inlineKeyboard([
      [Markup.button.callback(B.fullfilled, `fulfilled_${item.id}`)],
      [
        Markup.button.callback(B.edit, `edit_${item.id}`),
        Markup.button.callback(B.delete, `delete_${item.id}`),
      ],
      [Markup.button.callback(B.menu, 'menu')],
    ]);
  }

  // В остальных случаях — обычное меню для своих
  return itemButtonsMine(lang, item.id);
}

function itemButtonsOthersDynamic(
  lang: UILang,
  item: WishlistModel,
  meId: number,
) {
  const B = UI[lang].buttons;

  // Если бронь моя — дать снять бронь и отметить "уже куплено"
  if (item.status === 'RESERVED' && item.orderedById === meId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(B.unreserve, `unreserve_${item.id}`),
        Markup.button.callback(B.ordered, `ordered_${item.id}`),
      ],
      [Markup.button.callback(B.menu, 'menu')],
    ]);
  }

  // Если открыта — дать забронировать
  if (item.status === 'OPEN') {
    return Markup.inlineKeyboard([
      [Markup.button.callback(B.reserve, `reserve_${item.id}`)],
      [Markup.button.callback(B.menu, 'menu')],
    ]);
  }

  // Иначе — только назад в меню
  return Markup.inlineKeyboard([[Markup.button.callback(B.menu, 'menu')]]);
}

function editMenu(lang: UILang, id: string) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [Markup.button.callback(B.editName, `edit_name_${id}`)],
    [Markup.button.callback(B.editPrice, `edit_price_${id}`)],
    [Markup.button.callback(B.editUrl, `edit_url_${id}`)],
    [Markup.button.callback(B.editDescription, `edit_description_${id}`)],
    [Markup.button.callback(B.editPhotos, `edit_photos_${id}`)],
    [Markup.button.callback(B.save, `save_${id}`)],
    [Markup.button.callback(B.menu, 'menu')],
  ]);
}

function deleteConfirmMenu(lang: UILang, id: string) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(B.yes, `confirm_delete_${id}`),
      Markup.button.callback(B.no, `cancel_delete`),
    ],
  ]);
}
function renderReservationDetails(
  lang: UILang,
  item: WishlistModel,
  ownerUsername: string | null,
): string {
  const T = UI[lang];

  const lines: string[] = [];
  lines.push(`*${escapeMarkdownV2(T.itemViewHeader)}*`);

  lines.push(
    `*${escapeMarkdownV2(T.fieldName)}*: ${escapeMarkdownV2(item.name)}`,
  );

  const price = item.price ? String(item.price) : T.notSpecified;
  lines.push(`*${escapeMarkdownV2(T.fieldPrice)}*: ${escapeMarkdownV2(price)}`);

  const url = item.url ? item.url : T.notSpecified;
  lines.push(`*${escapeMarkdownV2(T.fieldUrl)}*: ${escapeMarkdownV2(url)}`);

  const description = item.description ? item.description : T.notSpecified;
  lines.push(
    `*${escapeMarkdownV2(T.description)}*: ${escapeMarkdownV2(description)}`,
  );
  // Доп. поля для режима "резервации"
  const statusLabel =
    item.status === 'OPEN'
      ? (T.statusOpen ?? 'OPEN')
      : item.status === 'RESERVED'
        ? (T.statusReserved ?? 'RESERVED')
        : item.status === 'ORDERED'
          ? (T.statusOrdered ?? 'ORDERED')
          : item.status === 'FULFILLED'
            ? (T.statusFulfilled ?? 'FULFILLED')
            : String(item.status);

  lines.push(
    `*${escapeMarkdownV2(T.status ?? 'Status')}*: ${escapeMarkdownV2(statusLabel)}`,
  );

  const ownerLabel = ownerUsername ? `@${ownerUsername}` : T.notSpecified;
  lines.push(
    `*${escapeMarkdownV2(T.owner ?? 'Owner')}*: ${escapeMarkdownV2(ownerLabel)}`,
  );

  const reservedBy =
    (item as any).reservedByUsername || (item as any).reservedBy || null;
  const orderedBy =
    (item as any).orderedByUsername || (item as any).orderedBy || null;

  if (reservedBy) {
    lines.push(
      `*${escapeMarkdownV2(T.reservedBy ?? 'Reserved by')}*: ${escapeMarkdownV2('@' + reservedBy)}`,
    );
  }
  if (orderedBy) {
    lines.push(
      `*${escapeMarkdownV2(T.orderedBy ?? 'Ordered by')}*: ${escapeMarkdownV2('@' + orderedBy)}`,
    );
  }

  return lines.join('\n');
}

function renderWishDetails(lang: UILang, item: WishlistModel): string {
  const T = UI[lang];
  const lines: string[] = [];
  lines.push(`*${escapeMarkdownV2(T.itemViewHeader)}*`);
  lines.push(
    `*${escapeMarkdownV2(T.fieldName)}*: ${escapeMarkdownV2(item.name)}`,
  );
  const price = item.price ? item.price : T.notSpecified;
  lines.push(`*${escapeMarkdownV2(T.fieldPrice)}*: ${escapeMarkdownV2(price)}`);
  const url = item.url ? item.url : T.notSpecified;
  lines.push(`*${escapeMarkdownV2(T.fieldUrl)}*: ${escapeMarkdownV2(url)}`);
  const description = item.description ? item.description : T.notSpecified;
  lines.push(
    `*${escapeMarkdownV2(T.description)}*: ${escapeMarkdownV2(description)}`,
  );
  return lines.join('\n');
}
function detailReservationButtons(
  lang: UILang,
  item: WishlistModel,
  meId: number,
) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [Markup.button.callback(B.unreserve, `unreserve_${item.id}`)],
    [Markup.button.callback(B.ordered, `ordered_${item.id}`)],
    [Markup.button.callback(B.menu, 'menu')],
  ]);
}

// ---------- service ----------

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Telegraf<BotContext>;

  constructor(
    private readonly config: ConfigService,
    private readonly users: UserService,
    private readonly wishes: WishlistsService,
    private readonly social: SocialService,
    private readonly media: MediaService,
  ) {
    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) throw new Error('BOT_TOKEN is not set');

    this.bot = new Telegraf<BotContext>(token);
    this.bot.use(session({ defaultSession: () => ({}) }));

    this.registerHandlers();
    this.bot.catch(async (err, ctx) => {
      this.logger.error('Telegraf error', err);
      const lang = resolveUILang(ctx);
      const fallback =
        lang === 'RU'
          ? 'Непредвиденная ошибка. Повторите попытку.'
          : lang === 'KK'
            ? 'Күтпеген қате. Кейінірек қайталап көріңіз.'
            : 'Unexpected error. Please try again.';
      try {
        await ctx.reply(escapeMarkdownV2(fallback), {
          parse_mode: 'MarkdownV2',
        });
      } catch {
        /* suppress */
      }
    });

    // BOT_DISABLED=1 — режим «только HTTP API» (разработка miniapp без
    // перехвата polling'а у боевого бота).
    if (this.config.get<string>('BOT_DISABLED') === '1') {
      this.logger.warn('Bot polling disabled (BOT_DISABLED=1)');
    } else {
      this.bot.launch();
      this.logger.verbose('Bot is running…');

      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
  }

  // --- helpers ---

  /**
   * file_id уже отправленных фото: повторно файл в Telegram не заливаем.
   * Кэш в памяти (как и session) — после рестарта фото просто зальются снова.
   */
  private readonly tgFileIds = new Map<string, string>();

  private async photoInput(key: string): Promise<InputFile | string> {
    return (
      this.tgFileIds.get(key) ?? {
        source: await this.media.readAsJpeg(key),
        filename: 'photo.jpg',
      }
    );
  }

  private rememberFileId(key: string, sizes: PhotoSize[] | undefined): void {
    const largest = sizes?.[sizes.length - 1];
    if (!largest) return;
    if (this.tgFileIds.size >= TG_FILE_ID_CACHE_LIMIT) this.tgFileIds.clear();
    this.tgFileIds.set(key, largest.file_id);
  }

  /**
   * Показ желания: без фото — текстом, с одним фото — фото с подписью,
   * с несколькими — альбомом (листается как карусель) и текстом с кнопками
   * следом: к альбому Telegram кнопки прикрепить не даёт. Сбой отправки фото
   * не мешает показать само желание.
   */
  private async replyWish(
    ctx: BotContext,
    item: WishlistModel,
    text: string,
    keyboard: ReturnType<typeof Markup.inlineKeyboard>,
  ): Promise<void> {
    const images = item.images;
    try {
      if (images.length === 1 && text.length <= TG_CAPTION_LIMIT) {
        const msg = await ctx.replyWithPhoto(
          await this.photoInput(images[0].key),
          { caption: text, parse_mode: 'MarkdownV2', ...keyboard },
        );
        this.rememberFileId(images[0].key, msg.photo);
        return;
      }
      if (images.length === 1) {
        const msg = await ctx.replyWithPhoto(
          await this.photoInput(images[0].key),
        );
        this.rememberFileId(images[0].key, msg.photo);
      } else if (images.length > 1) {
        const media = await Promise.all(
          images.map(async (im) => ({
            type: 'photo' as const,
            media: await this.photoInput(im.key),
          })),
        );
        const sent = await ctx.replyWithMediaGroup(media);
        sent.forEach((m, i) => {
          if ('photo' in m) this.rememberFileId(images[i].key, m.photo);
        });
      }
    } catch (err) {
      // file_id мог протухнуть — в следующий раз зальём файл заново
      images.forEach((im) => this.tgFileIds.delete(im.key));
      this.logger.warn(`replyWish photos failed: ${String(err)}`);
    }
    await ctx.reply(text, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  private async askDescription(ctx: BotContext): Promise<void> {
    const T = UI[resolveUILang(ctx)];
    ctx.session.step = 'waiting_for_description';
    await ctx.reply(escapeMarkdownV2(T.sendDescriptionOrSkip), {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.buttons.skip, 'skip_description')],
      ]),
      link_preview_options: { is_disabled: true },
    });
  }

  /**
   * Фото на шаге «ссылка или фото»: скачиваем через Bot API и кладём в то же
   * хранилище, что и загрузки из miniapp (file_id/токен наружу не уходят).
   */
  private async acceptWishPhoto(
    ctx: BotContext,
    fileId: string,
    mediaGroupId?: string,
  ): Promise<void> {
    const T = UI[resolveUILang(ctx)];
    // Куда кладём фото: черновик нового желания или правка существующего.
    const draft =
      ctx.session.step === 'waiting_for_url' ? ctx.session.item : undefined;
    const editing =
      !draft && ctx.session.editingField === 'photos'
        ? ctx.session.editingItem
        : undefined;
    const target = draft ?? editing;
    if (!target) {
      await this.showMainMenu(ctx);
      return;
    }
    if ((target.imageKeys?.length ?? 0) >= MAX_WISH_IMAGES) {
      await ctx.reply(escapeMarkdownV2(T.tooManyPhotos), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    const me = await this.ensureMe(ctx);
    let key: string;
    try {
      const link = await ctx.telegram.getFileLink(fileId);
      const res = await fetch(link);
      const data = Buffer.from(await res.arrayBuffer());
      if (!res.ok || data.length > MAX_UPLOAD_BYTES)
        throw new Error('bad file');
      key = (await this.media.saveImage(data, me.id, me.locale)).key;
    } catch (err) {
      this.logger.warn(`acceptWishPhoto failed: ${String(err)}`);
      await ctx.reply(escapeMarkdownV2(T.photoFailed), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    // Апдейты альбома обрабатываются параллельно над одним объектом сессии:
    // лимит перепроверяем уже после скачивания.
    target.imageKeys = target.imageKeys ?? [];
    if (target.imageKeys.length >= MAX_WISH_IMAGES) {
      await this.media.remove([key]);
      return;
    }
    target.imageKeys.push(key);

    if (mediaGroupId && ctx.session.lastMediaGroupId === mediaGroupId) return;
    ctx.session.lastMediaGroupId = mediaGroupId;
    const n = target.imageKeys.length;
    if (editing) {
      await ctx.reply(
        escapeMarkdownV2(T.hints.photoAddedEdit(n, T.buttons.save)),
        {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.save, `save_${editing.id}`)],
          ]),
        },
      );
      return;
    }
    await ctx.reply(escapeMarkdownV2(T.photoAdded(n, T.buttons.photosDone)), {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.buttons.photosDone, 'photos_done')],
      ]),
    });
  }

  /**
   * Отправка сервисного сообщения пользователю (уведомления подписок,
   * заявки в друзья). Ошибки доставки глотаются: пользователь мог
   * заблокировать бота — рассылку это ронять не должно.
   */
  async sendNotification(
    telegramId: bigint,
    text: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
  ): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(
        telegramId.toString(),
        escapeMarkdownV2(text),
        {
          parse_mode: 'MarkdownV2',
          link_preview_options: { is_disabled: true },
          ...(keyboard ?? {}),
        },
      );
    } catch (err) {
      this.logger.warn(
        `sendNotification failed for telegramId=${telegramId}: ${(err as Error).message}`,
      );
    }
  }

  private async ensureMe(ctx: BotContext) {
    // either from session cache or upsert by telegramId
    if (ctx.session.me?.id) return ctx.session.me;
    const tgId = BigInt(ctx.from!.id);
    const username = ctx.from!.username ?? null;
    const firstName = (ctx.from as any).first_name ?? null;
    const lastName = (ctx.from as any).last_name ?? null;
    // Язык клиента Telegram: начальный при создании и текущий, пока язык
    // не выбран явно в профиле miniapp (тогда выбор не перетирается).
    const clientLocale = localeFromLanguageCode(ctx.from?.language_code);
    const { data } = await this.users.registerOrUpdateByTelegramId(
      tgId,
      username,
      { firstName, lastName, clientLocale },
    );
    const locale = data.preferredLocale ?? 'EN';
    ctx.session.me = { id: data.id, telegramId: tgId, locale };
    return ctx.session.me;
  }

  private ui(ctx: BotContext) {
    return UI[resolveUILang(ctx)];
  }

  private async showMainMenu(ctx: BotContext) {
    const T = this.ui(ctx);
    await ctx.reply(escapeMarkdownV2(T.menuTitle), {
      parse_mode: 'MarkdownV2',
      ...buildMainMenu(resolveUILang(ctx)),
    });
  }

  // --- handlers registration ---

  private registerHandlers() {
    // /start
    this.bot.start(async (ctx) => {
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const firstName = (ctx.from as any).first_name ?? null;

      await this.ensureMe(ctx);
      await ctx.reply(escapeMarkdownV2(T.hello(firstName)), {
        parse_mode: 'MarkdownV2',
      });
      await this.showMainMenu(ctx);
    });

    // Menu
    this.bot.action('menu', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      // reset lightweight state but keep me
      ctx.session.step = undefined;
      ctx.session.item = undefined;
      ctx.session.editingItem = undefined;
      ctx.session.editingField = undefined;
      ctx.session.editingItemId = undefined;
      ctx.session.itemToDeleteId = undefined;
      ctx.session.lastMediaGroupId = undefined;

      await this.showMainMenu(ctx);
    });

    // Add flow
    this.bot.action('add', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const lang = resolveUILang(ctx);
      const T = UI[lang];

      ctx.session.item = {
        name: '',
        price: null,
        url: null,
        description: null,
      };
      ctx.session.step = 'waiting_for_name';
      await ctx.reply(escapeMarkdownV2(T.sendName), {
        parse_mode: 'MarkdownV2',
      });
    });

    // View mine
    this.bot.action('view', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = this.ui(ctx);
      const me = await this.ensureMe(ctx);

      const list = await this.wishes.listByOwner(me.id, {
        statuses: [
          WishlistStatus.OPEN,
          WishlistStatus.ORDERED,
          WishlistStatus.RESERVED,
        ],
        orderBy: 'createdAt',
        sort: 'desc',
      });

      if (!list.length) {
        await ctx.reply(escapeMarkdownV2(T.youHaveNoWishes), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.add, 'add')],
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
        return;
      }

      await ctx.reply(escapeMarkdownV2(T.listTitleMine), {
        parse_mode: 'MarkdownV2',
      });

      for (const it of list) {
        await ctx.reply(escapeMarkdownV2(it.name), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(it.name, `view_${it.id}`)],
          ]),
        });
      }
    });

    // View others → prompt for username
    this.bot.action('view_others', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = this.ui(ctx);
      ctx.session.step = 'waiting_for_username';
      await ctx.reply(escapeMarkdownV2(T.askUsername), {
        parse_mode: 'MarkdownV2',
      });
    });

    // Skip price / Skip link
    this.bot.action('skip_price', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      if (!ctx.session.item) return;

      ctx.session.item.price = null;
      ctx.session.step = 'waiting_for_url';
      await ctx.reply(escapeMarkdownV2(T.sendUrlOrPhoto), {
        parse_mode: 'MarkdownV2',
      });
    });

    // Шаг «ссылка или фото»: пропустить можно, только если фото уже есть.
    // skip_link оставлен для кнопок из сообщений, отправленных до появления фото.
    this.bot.action(['skip_link', 'photos_done'], async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = UI[resolveUILang(ctx)];
      if (ctx.session.step !== 'waiting_for_url' || !ctx.session.item) return;

      if (!ctx.session.item.imageKeys?.length) {
        await ctx.reply(escapeMarkdownV2(T.photoOrLinkRequired), {
          parse_mode: 'MarkdownV2',
        });
        return;
      }
      await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      await this.askDescription(ctx);
    });

    // Фото желания: обычное фото или картинка, отправленная файлом.
    this.bot.on('photo', async (ctx) => {
      const sizes = ctx.message.photo;
      await this.acceptWishPhoto(
        ctx,
        sizes[sizes.length - 1].file_id,
        ctx.message.media_group_id,
      );
    });
    this.bot.on('document', async (ctx) => {
      const doc = ctx.message.document;
      if (!doc.mime_type?.startsWith('image/')) return;
      await this.acceptWishPhoto(ctx, doc.file_id, ctx.message.media_group_id);
    });

    // Somewhere in your callback_query handler:
    this.bot.action('skip_description', async (ctx) => {
      if (ctx.session.step !== 'waiting_for_description') return;

      const me = await this.ensureMe(ctx);
      const item = ctx.session.item!;

      const created = await this.wishes.create({
        name: item.name,
        price: item.price ? (item.price as any) : undefined,
        ...(item.url ? { url: item.url } : {}),
        ...(item.imageKeys?.length ? { imageKeys: item.imageKeys } : {}),
        ownerId: me.id,
        status: 'OPEN',
        preferredLocale: me.locale,
      });
      await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      await ctx.reply(escapeMarkdownV2(created.message), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              UI[ctx.session.me?.locale ?? 'EN'].buttons.menu,
              'menu',
            ),
          ],
        ]),
        link_preview_options: { is_disabled: true },
      });

      ctx.session.step = undefined;
      ctx.session.item = undefined;
    });

    // View my reservations
    this.bot.action('friends', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = this.ui(ctx);
      const me = await this.ensureMe(ctx);
      const list = await this.social.listFriends(me.id);
      const text = list.length
        ? `${T.buttons.friendsList}\n\n${list.map(personLine).join('\n')}`
        : T.noFriends;
      await ctx.reply(escapeMarkdownV2(text), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
      });
    });

    this.bot.action('subscriptions', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = this.ui(ctx);
      const me = await this.ensureMe(ctx);
      const list = await this.social.listSubscriptions(me.id);
      const text = list.length
        ? `${T.buttons.subscriptionsList}\n\n${list.map(personLine).join('\n')}`
        : T.noSubscriptions;
      await ctx.reply(escapeMarkdownV2(text), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
      });
    });

    this.bot.action('view_reservations', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const T = this.ui(ctx);
      const me = await this.ensureMe(ctx);

      const list = await this.wishes.listReservedByUser(me.id, {
        orderBy: 'createdAt',
        sort: 'desc',
      });

      if (!list.length) {
        // покажем обычный "нет желаний", чтобы не плодить новый текст
        await ctx.reply(escapeMarkdownV2(T.youHaveNoWishes), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
        return;
      }

      await ctx.reply(escapeMarkdownV2('🔒 ' + T.buttons.viewMyReservations), {
        parse_mode: 'MarkdownV2',
      });

      for (const it of list) {
        const id = (it as any).id;
        if (!id || typeof id !== 'string') {
          this.logger.error(
            `Reservation item without id: ${JSON.stringify(it)}`,
          );
          continue;
        }
        const ownerUsername = (it as any).ownerName ?? null;

        await ctx.reply(
          escapeMarkdownV2(
            ownerUsername ? `@${ownerUsername}` : this.ui(ctx).notSpecified,
          ),
          {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(it.name, `view_reserved_${id}`)],
            ]),
          },
        );
      }
    });
    // Детальный просмотр элемента именно в контексте "моих броней"
    this.bot.action(/^view_reserved_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;
      const lang = resolveUILang(ctx);

      try {
        const me = await this.ensureMe(ctx);
        const item = await this.wishes.findOne(id);

        const ownerUsername =
          (item as any).ownerName ?? (item as any).ownerUsername ?? null;

        const details = renderReservationDetails(lang, item, ownerUsername);

        const keyboard = detailReservationButtons(lang, item, me.id);

        await this.replyWish(ctx, item, details, keyboard);

        ctx.session.editingItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          url: item.url,
          description: item.description,
          ownerId: item.ownerId,
        };
        ctx.session.editingItemId = item.id;
      } catch {
        const msg =
          lang === 'RU'
            ? 'Элемент не найден.'
            : lang === 'KK'
              ? 'Элемент табылмады.'
              : 'Item not found.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    this.bot.action(/^view_(?!others$|other_)([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const id = ctx.match?.[1];
      if (!id) return;

      try {
        const item = await this.wishes.findOne(id);
        await this.replyWish(
          ctx,
          item,
          renderWishDetails(lang, item),
          itemButtonsMineDynamic(lang, item),
        );

        ctx.session.editingItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          url: item.url,
          description: item.description,
          ownerId: item.ownerId,
        };
        ctx.session.editingItemId = item.id;
      } catch {
        const msg =
          lang === 'RU'
            ? 'Элемент не найден.'
            : lang === 'KK'
              ? 'Элемент табылмады.'
              : 'Item not found.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Edit menu — не перехватываем edit_name|price|url|description|photos_
    this.bot.action(EDIT_MENU_RE, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;
      const lang = resolveUILang(ctx);

      await ctx.reply(escapeMarkdownV2('⚙️'), {
        parse_mode: 'MarkdownV2',
        ...editMenu(lang, id),
      });
    });

    // Choose field to edit
    this.bot.action(EDIT_FIELD_RE, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const field = ctx.match?.[1] as 'name' | 'price' | 'url' | 'description';
      const id = ctx.match?.[2];
      if (!id || !field) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const fresh = await this.wishes.findOne(id);
        ctx.session.editingItem = {
          id: fresh.id,
          name: fresh.name,
          price: fresh.price,
          url: fresh.url,
          description: fresh.description,
          ownerId: fresh.ownerId,
        };
        ctx.session.editingField = field;
        ctx.session.editingItemId = id;

        const hint =
          field === 'name'
            ? T.hints.enterNewName
            : field === 'price'
              ? T.hints.enterNewPrice
              : field === 'url'
                ? T.hints.enterNewUrl
                : T.hints.enterNewDescription;

        await ctx.reply(escapeMarkdownV2(hint), { parse_mode: 'MarkdownV2' });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Элемент не найден.'
            : lang === 'KK'
              ? 'Элемент табылмады.'
              : 'Item not found.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Фото желания: присланные фото добавляются к текущим, «удалить все» —
    // чтобы заменить набор. Сохраняется общей кнопкой «Сохранить».
    this.bot.action(EDIT_PHOTOS_RE, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;
      const T = UI[resolveUILang(ctx)];
      try {
        const fresh = await this.wishes.findOne(id);
        ctx.session.editingItem = {
          id: fresh.id,
          name: fresh.name,
          price: fresh.price,
          url: fresh.url,
          description: fresh.description,
          ownerId: fresh.ownerId,
          imageKeys: fresh.images.map((im) => im.key),
        };
        ctx.session.editingField = 'photos';
        ctx.session.editingItemId = id;
        await ctx.reply(
          escapeMarkdownV2(T.hints.editPhotos(fresh.images.length)),
          {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              ...(fresh.images.length
                ? [
                    [
                      Markup.button.callback(
                        T.buttons.clearPhotos,
                        `photos_clear_${id}`,
                      ),
                    ],
                  ]
                : []),
              [Markup.button.callback(T.buttons.save, `save_${id}`)],
              [Markup.button.callback(T.buttons.menu, 'menu')],
            ]),
          },
        );
      } catch {
        await ctx.reply(escapeMarkdownV2(T.itemNotFound), {
          parse_mode: 'MarkdownV2',
        });
      }
    });

    this.bot.action(PHOTOS_CLEAR_RE, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      const T = UI[resolveUILang(ctx)];
      const editing = ctx.session.editingItem;
      if (!id || !editing || editing.id !== id) return;
      editing.imageKeys = [];
      ctx.session.editingField = 'photos';
      await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      await ctx.reply(escapeMarkdownV2(T.hints.photosCleared(T.buttons.save)), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.save, `save_${id}`)],
        ]),
      });
    });

    // Save changes
    this.bot.action(/^save_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      if (!ctx.session.editingItem || ctx.session.editingItem.id !== id) {
        const msg =
          lang === 'RU'
            ? 'Нет активной сессии редактирования.'
            : lang === 'KK'
              ? 'Өңдеу сессиясы белсенді емес.'
              : 'No active edit session.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
        return;
      }

      const me = await this.ensureMe(ctx);
      const dto: any = {
        preferredLocale: lang, // текущий язык UI
        ownerId: me.id, // проверка владения на уровне сервиса
        name: ctx.session.editingItem.name,
        price:
          ctx.session.editingItem.price === null
            ? null
            : ctx.session.editingItem.price,
        url:
          ctx.session.editingItem.url === null
            ? null
            : ctx.session.editingItem.url,
        description:
          ctx.session.editingItem.description === null
            ? null
            : ctx.session.editingItem.description,
        ...(ctx.session.editingItem.imageKeys !== undefined
          ? { imageKeys: ctx.session.editingItem.imageKeys }
          : {}),
      };

      try {
        await this.wishes.update(id, dto, lang);
        await ctx.reply(escapeMarkdownV2(T.saved), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.viewWish, `view_${id}`)],
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch (err) {
        // Понятная причина от домена (например, «нужно фото или ссылка»)
        // важнее общего «не удалось».
        const msg =
          err instanceof HttpException && err.getStatus() < 500
            ? err.message
            : lang === 'RU'
              ? 'Сохранить не удалось.'
              : lang === 'KK'
                ? 'Сақтау мүмкін болмады.'
                : 'Failed to save.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      } finally {
        ctx.session.editingItem = undefined;
        ctx.session.editingField = undefined;
        ctx.session.editingItemId = undefined;
      }
    });

    // Delete
    this.bot.action(/^delete_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      ctx.session.itemToDeleteId = id;
      await ctx.reply(escapeMarkdownV2('❓'), {
        parse_mode: 'MarkdownV2',
        ...deleteConfirmMenu(lang, id),
      });
    });

    // Confirm delete
    this.bot.action(/^confirm_delete_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const me = await this.ensureMe(ctx);
        await this.wishes.remove(id, lang, me.id);
        await ctx.reply(escapeMarkdownV2(T.deleted), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Удалить не удалось.'
            : lang === 'KK'
              ? 'Жою мүмкін болмады.'
              : 'Failed to delete.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      } finally {
        ctx.session.itemToDeleteId = undefined;
      }
    });

    // Cancel delete
    this.bot.action('cancel_delete', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const lang = resolveUILang(ctx);
      const T = UI[lang];

      await ctx.reply(escapeMarkdownV2(T.deletionCanceled), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
      });
      ctx.session.itemToDeleteId = undefined;
    });

    // View other's item
    this.bot.action(/^view_other_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      this.logger.warn(`view_other clicked id=${id}`);

      if (!id) return;

      const lang = resolveUILang(ctx);

      try {
        const me = await this.ensureMe(ctx);
        const item = await this.wishes.findOne(id);
        // Невидимое желание не палим — отвечаем как про несуществующее
        if (!(await this.wishes.canView(item, me.id))) {
          throw new NotFoundException();
        }
        await this.replyWish(
          ctx,
          item,
          renderWishDetails(lang, item),
          itemButtonsOthersDynamic(lang, item, me.id),
        );
      } catch {
        const msg =
          lang === 'RU'
            ? 'Элемент не найден.'
            : lang === 'KK'
              ? 'Элемент табылмады.'
              : 'Item not found.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Unreserve (снять бронь)
    this.bot.action(/^unreserve_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const me = await this.ensureMe(ctx);
        const res = await this.wishes.unreserveTheWish(id, me.id, lang);
        await ctx.reply(escapeMarkdownV2(res.message || T.saved), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Снять бронь не удалось.'
            : lang === 'KK'
              ? 'Бронь алу мүмкін болмады.'
              : 'Failed to unreserve.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Mark as ordered (куплено)
    this.bot.action(/^ordered_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const me = await this.ensureMe(ctx);
        const res = await this.wishes.markAsOrdered(id, me.id, lang);
        await ctx.reply(escapeMarkdownV2(res.message || T.saved), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Отметить покупку не удалось.'
            : lang === 'KK'
              ? 'Сатып алынды деп белгілеу мүмкін болмады.'
              : 'Failed to mark as ordered.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Mark as fulfilled (для владельца)
    this.bot.action(/^fulfilled_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const me = await this.ensureMe(ctx);
        const res = await this.wishes.markAsFulfilled(id, me.id, lang);
        await ctx.reply(escapeMarkdownV2(res.message || T.saved), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Отметить исполнение не удалось.'
            : lang === 'KK'
              ? 'Орындалды деп белгілеу мүмкін болмады.'
              : 'Failed to mark as fulfilled.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Reserve other's item
    this.bot.action(/^reserve_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const id = ctx.match?.[1];
      if (!id) return;

      const lang = resolveUILang(ctx);
      const T = UI[lang];

      try {
        const me = await this.ensureMe(ctx);
        const res = await this.wishes.reserveTheWish(id, me.id, lang);
        await ctx.reply(escapeMarkdownV2(res.message || T.reservedOk), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch {
        const msg =
          lang === 'RU'
            ? 'Бронь не удалось оформить.'
            : lang === 'KK'
              ? 'Бронь жасау мүмкін болмады.'
              : 'Failed to reserve.';
        await ctx.reply(escapeMarkdownV2(msg), { parse_mode: 'MarkdownV2' });
      }
    });

    // Subscribe / unsubscribe to someone's wishlist
    this.bot.action(/^sub_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const targetId = Number(ctx.match?.[1]);
      if (!targetId) return;
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const me = await this.ensureMe(ctx);
      const res = await this.social.subscribe(me.id, targetId, lang);
      await ctx.reply(escapeMarkdownV2(res.message), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.unsubscribe, `unsub_${targetId}`)],
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
      });
    });

    this.bot.action(/^unsub_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const targetId = Number(ctx.match?.[1]);
      if (!targetId) return;
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const me = await this.ensureMe(ctx);
      const res = await this.social.unsubscribe(me.id, targetId, lang);
      await ctx.reply(escapeMarkdownV2(res.message), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.subscribe, `sub_${targetId}`)],
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
      });
    });

    // Friend request
    this.bot.action(/^fr_req_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const targetId = Number(ctx.match?.[1]);
      if (!targetId) return;
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const me = await this.ensureMe(ctx);

      try {
        const res = await this.social.requestFriend(me.id, targetId, lang);

        if (res.outcome === 'REQUESTED') {
          // Сообщение адресату с кнопкой принятия — в его локали
          const target = await this.users.findOne(targetId);
          const targetT = UI[target.preferredLocale] ?? UI.EN;
          const myName = ctx.from?.username
            ? `@${ctx.from.username}`
            : ((ctx.from as any)?.first_name ?? 'Erkelik');
          await this.sendNotification(
            target.telegramId,
            targetT.friendRequestFrom(myName),
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  targetT.buttons.acceptFriend,
                  `fr_acc_${res.friendshipId}`,
                ),
              ],
            ]),
          );
        }

        await ctx.reply(escapeMarkdownV2(res.message), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch (e) {
        const msg =
          e instanceof Error && 'getResponse' in e
            ? (e as any).message
            : T.notSpecified;
        await ctx.reply(escapeMarkdownV2(String(msg)), {
          parse_mode: 'MarkdownV2',
        });
      }
    });

    // Accept friend request
    this.bot.action(/^fr_acc_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const friendshipId = Number(ctx.match?.[1]);
      if (!friendshipId) return;
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const me = await this.ensureMe(ctx);

      try {
        const res = await this.social.acceptFriend(friendshipId, me.id, lang);
        await ctx.reply(escapeMarkdownV2(res.message), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.menu, 'menu')],
          ]),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : T.notSpecified;
        await ctx.reply(escapeMarkdownV2(String(msg)), {
          parse_mode: 'MarkdownV2',
        });
      }
    });

    // Text handler
    this.bot.on('text', async (ctx) => {
      const lang = resolveUILang(ctx);
      const T = UI[lang];
      const text = ctx.message.text.trim();

      // 1) Enter other's username
      if (ctx.session.step === 'waiting_for_username') {
        const raw = text.replace(/^@/, '');
        if (!isValidUsername(raw)) {
          await ctx.reply(escapeMarkdownV2(T.askUsername), {
            parse_mode: 'MarkdownV2',
          });
          return;
        }
        let u;
        try {
          u = await this.users.findByUsername(raw);
        } catch (e) {
          if (e instanceof NotFoundException) {
            await ctx.reply(escapeMarkdownV2(T.userNotRegister), {
              parse_mode: 'MarkdownV2',
              ...Markup.inlineKeyboard([
                [Markup.button.callback(T.buttons.menu, 'menu')],
              ]),
            });
            ctx.session.step = undefined;
            return;
          }
          throw e;
        }
        const me = await this.ensureMe(ctx);
        // Чужой список — только то, что видно смотрящему (PUBLIC/FRIENDS/CUSTOM)
        const list = await this.wishes.listVisibleByOwner(u.id, me.id, {
          statuses: [WishlistStatus.OPEN],
          orderBy: 'createdAt',
          sort: 'desc',
        });

        const [subscribed, friends] = await Promise.all([
          this.social.isSubscribed(me.id, u.id),
          this.social.areFriends(me.id, u.id),
        ]);
        const socialRow = [
          Markup.button.callback(
            subscribed ? T.buttons.unsubscribe : T.buttons.subscribe,
            subscribed ? `unsub_${u.id}` : `sub_${u.id}`,
          ),
          ...(friends || me.id === u.id
            ? []
            : [Markup.button.callback(T.buttons.addFriend, `fr_req_${u.id}`)]),
        ];

        if (!list.length) {
          await ctx.reply(escapeMarkdownV2(T.userHasNoWishes), {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              socialRow,
              [Markup.button.callback(T.buttons.menu, 'menu')],
            ]),
          });
          ctx.session.step = undefined;
          return;
        }

        await ctx.reply(
          escapeMarkdownV2(UI[lang].listTitleOthers(u.username ?? raw)),
          {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([socialRow]),
          },
        );
        for (const it of list) {
          await ctx.reply(escapeMarkdownV2(it.name), {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(it.name, `view_other_${it.id}`)],
            ]),
          });
        }
        ctx.session.step = undefined;
        return;
      }

      // 2) Add flow master: name -> price -> url
      if (ctx.session.step === 'waiting_for_name') {
        ctx.session.item = ctx.session.item ?? {
          name: '',
          price: null,
          url: null,
          description: null,
        };
        ctx.session.item.name = text;
        ctx.session.step = 'waiting_for_price';
        await ctx.reply(escapeMarkdownV2(T.sendPriceOrSkip), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.skip, 'skip_price')],
          ]),
        });
        return;
      }

      if (ctx.session.step === 'waiting_for_price') {
        const price = normalizePriceInput(text);
        if (price === null) {
          await ctx.reply(escapeMarkdownV2(T.invalidPrice), {
            parse_mode: 'MarkdownV2',
          });
          return;
        }
        ctx.session.item!.price = price;
        ctx.session.step = 'waiting_for_url';
        await ctx.reply(escapeMarkdownV2(T.sendUrlOrPhoto), {
          parse_mode: 'MarkdownV2',
        });
        return;
      }

      if (ctx.session.step === 'waiting_for_url') {
        ctx.session.item!.url = text;
        await this.askDescription(ctx);
        return;
      }

      if (ctx.session.step === 'waiting_for_description') {
        const me = await this.ensureMe(ctx);
        const v = text.trim();
        // allow "-" as explicit clear like your edit flow
        ctx.session.item!.description = v === '-' ? null : v;
        const item = ctx.session.item!;

        const created = await this.wishes.create({
          name: item.name,
          price: item.price ? (item.price as any) : undefined,
          ...(item.url ? { url: item.url } : {}),
          ...(item.description ? { description: item.description } : {}),
          ...(item.imageKeys?.length ? { imageKeys: item.imageKeys } : {}),
          ownerId: me.id,
          status: 'OPEN',
          preferredLocale: me.locale,
        });

        await ctx.reply(escapeMarkdownV2(created.message), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(UI[lang].buttons.menu, 'menu')],
          ]),
          link_preview_options: { is_disabled: true },
        });

        ctx.session.step = undefined;
        ctx.session.item = undefined;
        return;
      }
      // 3) Editing field handler
      if (ctx.session.editingItem && ctx.session.editingField) {
        const field = ctx.session.editingField;

        if (field === 'photos') {
          const n = ctx.session.editingItem.imageKeys?.length ?? 0;
          await ctx.reply(escapeMarkdownV2(T.hints.editPhotos(n)), {
            parse_mode: 'MarkdownV2',
          });
          return;
        }

        if (field === 'name') {
          ctx.session.editingItem.name = text;
        } else if (field === 'price') {
          const p = normalizePriceInput(text);
          if (p === null) {
            await ctx.reply(escapeMarkdownV2(T.invalidPrice), {
              parse_mode: 'MarkdownV2',
            });
            return;
          }
          ctx.session.editingItem.price = p;
        } else if (field === 'url') {
          const v = text.trim();
          ctx.session.editingItem.url = v === '-' ? null : v.length ? v : null;
        } else if (field === 'description') {
          const v = text.trim();
          ctx.session.editingItem.description =
            v === '-' ? null : v.length ? v : null;
        }

        ctx.session.editingField = undefined;

        await ctx.reply(
          escapeMarkdownV2(UI[lang].hints.okPressSave(UI[lang].buttons.save)),
          {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  UI[lang].buttons.save,
                  `save_${ctx.session.editingItem.id}`,
                ),
              ],
            ]),
          },
        );
        return;
      }

      // default: show menu again
      await this.showMainMenu(ctx);
    });
  }
}
