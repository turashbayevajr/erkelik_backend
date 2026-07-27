import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UI } from './bot.i18n';
import { BotService } from './bot.service';
import { SocialService } from 'src/social/service/social.service';
import { WishlistsService } from 'src/wishlist/service/wishlist.service';
import {
  WISH_CREATED,
  WishCreatedEvent,
} from 'src/wishlist/wish-created.event';

// Уведомления подписчикам о новом желании. Живёт в bot-слое:
// домен эмитит wish.created и ничего не знает о Telegram.
@Injectable()
export class WishNotificationsListener {
  private readonly logger = new Logger(WishNotificationsListener.name);

  constructor(
    private readonly bot: BotService,
    private readonly social: SocialService,
    private readonly wishes: WishlistsService,
  ) {}

  @OnEvent(WISH_CREATED, { async: true })
  async handleWishCreated(event: WishCreatedEvent): Promise<void> {
    try {
      const subscribers = await this.social.listSubscribers(event.ownerId);
      if (!subscribers.length) return;

      const wish = await this.wishes.findOne(event.wishId);
      const ownerLabel = wish.ownerName ? `@${wish.ownerName}` : '🎁';

      for (const sub of subscribers) {
        // Видимость обязана соблюдаться и в рассылке: FRIENDS/CUSTOM
        // желание не должно уйти постороннему подписчику.
        const visible = await this.wishes.canView(wish, sub.userId);
        if (!visible) continue;

        const T = UI[sub.preferredLocale] ?? UI.EN;
        await this.bot.sendNotification(
          sub.telegramId,
          T.notifNewWish(ownerLabel, wish.name),
        );
      }
    } catch (err) {
      this.logger.error(
        `wish.created notification failed for wish=${event.wishId}`,
        (err as Error).stack,
      );
    }
  }
}
