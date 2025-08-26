import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Markup, Telegraf, session } from 'telegraf';
import type { BotContext } from './bot.types';
import { UI, UILang } from './bot.i18n';

import { WishlistModel } from 'src/wishlist/repository/wishlist.model';
import { UserService } from 'src/users/service/users.service';
import { WishlistsService } from 'src/wishlist/service/wishlist.service';

// ---------- utils ----------

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
  return n.toString();
}
function resolveUILang(ctx: BotContext): UILang {
  // cached session locale if exists
  if (ctx.session?.me?.locale) return ctx.session.me.locale;
  const lc = (ctx.from as any)?.language_code?.toString().toLowerCase();
  if (lc === 'ru') return 'RU';
  if (lc === 'kk' || lc === 'kz') return 'KK';
  return 'EN';
}

function buildMainMenu(lang: UILang) {
  const B = UI[lang].buttons;
  return Markup.inlineKeyboard([
    [Markup.button.callback(B.add, 'add')],
    [Markup.button.callback(B.viewMine, 'view')],
    [Markup.button.callback(B.viewOthers, 'view_others')],
    [Markup.button.callback(B.viewMyReservations, 'view_reservations')],
  ]);
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

    this.bot.launch();
    this.logger.verbose('Bot is running…');

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  // --- helpers ---

  private async ensureMe(ctx: BotContext) {
    // either from session cache or upsert by telegramId
    if (ctx.session.me?.id) return ctx.session.me;
    const tgId = BigInt(ctx.from!.id);
    const username = ctx.from!.username ?? null;
    const firstName = (ctx.from as any).first_name ?? null;
    const lastName = (ctx.from as any).last_name ?? null;
    const lang = resolveUILang(ctx);
    const { data } = await this.users.registerOrUpdateByTelegramId(
      tgId,
      username,
      { firstName, lastName, preferredLocale: lang },
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

      await this.showMainMenu(ctx);
    });

    // Add flow
    this.bot.action('add', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const lang = resolveUILang(ctx);
      const T = UI[lang];

      ctx.session.item = { name: '', price: null, url: null };
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
      await ctx.reply(escapeMarkdownV2(T.sendUrlOrSkip), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.skip, 'skip_link')],
        ]),
      });
    });

    this.bot.action('skip_link', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const me = await this.ensureMe(ctx);
      const lang = resolveUILang(ctx);
      const T = UI[lang];

      if (!ctx.session.item) return;

      const created = await this.wishes.create({
        name: ctx.session.item.name,
        price: ctx.session.item.price
          ? (ctx.session.item.price as any)
          : undefined,
        ownerId: me.id,
        status: 'OPEN',
        preferredLocale: me.locale,
      });

      await ctx.reply(escapeMarkdownV2(created.message), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.buttons.menu, 'menu')],
        ]),
        link_preview_options: { is_disabled: true },
      });

      ctx.session.step = undefined;
      ctx.session.item = undefined;
    });

    // View my reservations
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

        await ctx.reply(details, {
          parse_mode: 'MarkdownV2',
          ...keyboard,
          link_preview_options: { is_disabled: true },
        });

        ctx.session.editingItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          url: item.url,
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
        await ctx.reply(renderWishDetails(lang, item), {
          parse_mode: 'MarkdownV2',
          ...itemButtonsMineDynamic(lang, item),
          link_preview_options: { is_disabled: true },
        });

        ctx.session.editingItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          url: item.url,
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

    // Edit menu — не перехватываем edit_name|price|url_
    this.bot.action(/^edit_(?!name_|price_|url_)([\w-]+)$/, async (ctx) => {
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
    this.bot.action(/^edit_(name|price|url)_([\w-]+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const field = ctx.match?.[1] as 'name' | 'price' | 'url';
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
          ownerId: fresh.ownerId,
        };
        ctx.session.editingField = field;
        ctx.session.editingItemId = id;

        const hint =
          field === 'name'
            ? T.hints.enterNewName
            : field === 'price'
              ? T.hints.enterNewPrice
              : T.hints.enterNewUrl;

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
      } catch {
        const msg =
          lang === 'RU'
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
        await ctx.reply(renderWishDetails(lang, item), {
          parse_mode: 'MarkdownV2',
          ...itemButtonsOthersDynamic(lang, item, me.id),
          link_preview_options: { is_disabled: true },
        });
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
        const list = await this.wishes.listByOwner(u.id, {
          orderBy: 'createdAt',
          sort: 'desc',
        });
        if (!list.length) {
          await ctx.reply(escapeMarkdownV2(T.userHasNoWishes), {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(T.buttons.menu, 'menu')],
            ]),
          });
          ctx.session.step = undefined;
          return;
        }

        await ctx.reply(
          escapeMarkdownV2(UI[lang].listTitleOthers(u.username ?? raw)),
          { parse_mode: 'MarkdownV2' },
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
        await ctx.reply(escapeMarkdownV2(T.sendUrlOrSkip), {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.buttons.skip, 'skip_link')],
          ]),
        });
        return;
      }

      if (ctx.session.step === 'waiting_for_url') {
        const me = await this.ensureMe(ctx);
        ctx.session.item!.url = text;

        const created = await this.wishes.create({
          name: ctx.session.item!.name,
          price: ctx.session.item!.price
            ? (ctx.session.item!.price as any)
            : undefined,
          url: ctx.session.item!.url,
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
          ctx.session.editingItem.url = v === '-' ? null : v;
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
