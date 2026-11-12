import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MediaService } from 'src/media/service/media.service';
import type { IWishlistRepository } from './repository/wishlist.repository';

/**
 * Свежие файлы не трогаем: фото загружается до сохранения желания (форма
 * miniapp, черновик в боте), и черновик может ещё жить.
 */
export const ORPHAN_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Раз в месяц удаляет фото, которые не прикреплены ни к одному желанию:
 * загрузили, но желание так и не сохранили, или бросили редактирование.
 */
@Injectable()
export class WishImagesCleanupJob {
  private readonly logger = new Logger(WishImagesCleanupJob.name);

  constructor(
    @Inject('IWishlistRepository')
    private readonly repo: IWishlistRepository,
    private readonly media: MediaService,
  ) {}

  // 1-го числа в 04:00 по серверному TZ (Asia/Aqtau в образе)
  @Cron('0 4 1 * *', { name: 'wish-images-cleanup' })
  async run(): Promise<void> {
    try {
      const removed = await this.removeOrphans();
      this.logger.log(`Removed ${removed.length} unused photo(s)`);
    } catch (err) {
      this.logger.error(
        'Unused photos cleanup failed',
        (err as Error)?.stack ?? String(err),
      );
    }
  }

  /** Возвращает удалённые ключи. */
  async removeOrphans(now = new Date()): Promise<string[]> {
    const stored = await this.media.listStored();
    const old = stored
      .filter((f) => now.getTime() - f.modifiedAt.getTime() > ORPHAN_GRACE_MS)
      .map((f) => f.key);
    if (!old.length) return [];

    const attached = new Set(await this.repo.findAttachedImageKeys(old));
    const orphans = old.filter((key) => !attached.has(key));
    await this.media.remove(orphans);
    return orphans;
  }
}
