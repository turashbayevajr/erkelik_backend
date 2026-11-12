import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/auth-user';
import { t } from 'src/common/messages';
import type { UserModel } from 'src/users/repository/users.model';
import {
  MAX_UPLOAD_BYTES,
  MediaService,
  mediaUrl,
} from '../service/media.service';

/** Поля multer-файла, которые нам нужны (без зависимости от @types/multer). */
interface UploadedImage {
  buffer: Buffer;
}

@Controller('api/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * Загрузка одного фото (multipart, поле `file`). Возвращает ключ, который
   * затем передаётся в `imageKeys` при создании/редактировании желания.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @CurrentUser() user: UserModel,
    @UploadedFile() file?: UploadedImage,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        t('IMAGE_INVALID', user.preferredLocale, ''),
      );
    }
    const image = await this.media.saveImage(
      file.buffer,
      user.id,
      user.preferredLocale,
    );
    return { ...image, url: mediaUrl(image.key) };
  }
}
