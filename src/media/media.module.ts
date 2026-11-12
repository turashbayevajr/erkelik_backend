import { Module } from '@nestjs/common';
import { MediaController } from './api/media.controller';
import { MediaService } from './service/media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
