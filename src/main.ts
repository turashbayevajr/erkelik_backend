import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  // В проде WEBAPP_ORIGIN — домен(ы) miniapp через запятую; без него dev-режим
  // остаётся открытым.
  const corsOrigin = process.env.WEBAPP_ORIGIN
    ? process.env.WEBAPP_ORIGIN.split(',').map((o) => o.trim())
    : '*';
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.enableShutdownHooks();

  const PORT = Number(process.env.PORT) || 4002;
  const server = await app.listen(PORT, '0.0.0.0');
  logger.log(`Listening on http://localhost:${PORT}`);

  const shutdown = async (signal: string, code = 0) => {
    try {
      logger.log(`Received ${signal}. Closing HTTP server...`);
      await app.close();
      await new Promise<void>((resolve) => {
        if (server && typeof server.close === 'function') {
          server.close(() => resolve());
        } else {
          resolve();
        }
      });
      logger.log('HTTP server closed. Exiting.');
    } catch (err) {
      logger.error('Error during shutdown', err);
      code = 1;
    } finally {
      process.exit(code);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT', 0));
  process.once('SIGTERM', () => shutdown('SIGTERM', 0));
  process.once('SIGUSR2', async () => {
    await shutdown('SIGUSR2', 0);
    process.kill(process.pid, 'SIGUSR2');
  });
  process.on('unhandledRejection', async (reason) => {
    logger.error('UnhandledRejection', reason as any);
    await shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', async (err) => {
    logger.error('UncaughtException', err);
    await shutdown('uncaughtException', 1);
  });
}

bootstrap();
