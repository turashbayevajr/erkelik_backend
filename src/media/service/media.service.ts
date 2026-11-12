import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as sharp from 'sharp';
import type { Locale as PrismaLocale } from '@prisma/client';
import type { Locale as CommonLocale } from 'src/common/i18n';
import { t } from 'src/common/messages';

type LocaleLike = CommonLocale | PrismaLocale | undefined;

export interface StoredImage {
  key: string;
  width: number;
  height: number;
}

/** Потолок входного файла; после обработки фото весит на порядок меньше. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Длинная сторона после обработки: хватает на экран телефона с запасом. */
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 2560;

// Ключ = `<ownerId>-<uuid>.webp`. Владелец зашит в имя, чтобы чужой ключ
// нельзя было прикрепить к своему желанию (и потом удалить вместе с ним).
const KEY_RE = /^(\d+)-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.webp$/;

/** Каталог с фото: в проде — docker volume (UPLOADS_DIR). */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
}

/** Публичный путь файла; раздаётся статикой в main.ts. */
export const MEDIA_PREFIX = '/api/media/';
export function mediaUrl(key: string): string {
  return `${MEDIA_PREFIX}${key}`;
}

/**
 * Единственное место, которое знает, где физически лежат фото. Сейчас —
 * локальный диск; при переезде на S3 меняется только этот класс.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  isValidKey(key: string): boolean {
    return KEY_RE.test(key);
  }

  isOwnedBy(key: string, ownerId: number): boolean {
    const m = KEY_RE.exec(key);
    return m !== null && Number(m[1]) === ownerId;
  }

  /**
   * Любой вход перекодируется в webp: это и проверка «точно картинка»,
   * и срезание EXIF (геолокация), и предсказуемый размер файла.
   */
  async saveImage(
    input: Buffer,
    ownerId: number,
    locale?: LocaleLike,
  ): Promise<StoredImage> {
    let data: Buffer;
    let width: number;
    let height: number;
    try {
      const out = await sharp(input)
        .rotate() // применить EXIF-ориентацию до удаления метаданных
        .resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      data = out.data;
      width = out.info.width;
      height = out.info.height;
    } catch {
      throw new BadRequestException(t('IMAGE_INVALID', locale, ''));
    }

    const key = `${ownerId}-${randomUUID()}.webp`;
    await fs.mkdir(uploadsDir(), { recursive: true });
    await fs.writeFile(join(uploadsDir(), key), data);
    return { key, width, height };
  }

  /** Размеры сохранённого фото; null — ключ битый или файла нет. */
  async describe(key: string): Promise<StoredImage | null> {
    if (!this.isValidKey(key)) return null;
    try {
      const meta = await sharp(join(uploadsDir(), key)).metadata();
      if (!meta.width || !meta.height) return null;
      return { key, width: meta.width, height: meta.height };
    } catch {
      return null;
    }
  }

  /**
   * Фото для отправки в Telegram: храним webp, а sendPhoto надёжно
   * принимает JPEG — перекодируем на лету (файлы маленькие, это дёшево).
   */
  async readAsJpeg(key: string): Promise<Buffer> {
    if (!this.isValidKey(key)) throw new Error(`invalid media key: ${key}`);
    return sharp(join(uploadsDir(), key)).jpeg({ quality: 85 }).toBuffer();
  }

  /** Все сохранённые фото с датой изменения (для чистки сирот). */
  async listStored(): Promise<{ key: string; modifiedAt: Date }[]> {
    let names: string[];
    try {
      names = await fs.readdir(uploadsDir());
    } catch (err) {
      if ((err as { code?: string })?.code === 'ENOENT') return [];
      throw err;
    }
    const keys = names.filter((name) => this.isValidKey(name));
    return Promise.all(
      keys.map(async (key) => ({
        key,
        modifiedAt: (await fs.stat(join(uploadsDir(), key))).mtime,
      })),
    );
  }

  /** Удаление не должно ронять основную операцию — ошибки только в лог. */
  async remove(keys: string[]): Promise<void> {
    await Promise.all(
      keys
        .filter((key) => this.isValidKey(key))
        .map((key) =>
          fs.unlink(join(uploadsDir(), key)).catch((err: unknown) => {
            if ((err as { code?: string })?.code !== 'ENOENT')
              this.logger.warn(`remove(${key}) failed: ${String(err)}`);
          }),
        ),
    );
  }
}
