import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { BotService } from './bot.service';

/** Данные о боте для miniapp: username нужен для ссылки-приглашения. */
@Controller('api/bot')
export class BotController {
  constructor(private readonly bot: BotService) {}

  @Get()
  async info() {
    try {
      return { username: await this.bot.botUsername() };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
