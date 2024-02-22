import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
// eslint-disable-next-line import/no-extraneous-dependencies
import { urlencoded, json, raw, type NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import AppModule from './app.module.js';
import BotLogger from './logger/bot.logger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
    rawBody: true,
  });
  // app.use(
  //   '/rasa-actions/evaluations',
  //   (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
  //     console.log(req);
  //     next();
  //   },
  // );

  app.useLogger(app.get(BotLogger));
  app.use(compression());
  if (process.env.RATE_LIMIT !== '-1') {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: Number.isNaN(process.env.RATE_LIMIT)
          ? 300
          : Number(process.env.RATE_LIMIT), // limit each IP to 300 requests per windowMs
      }),
    );
  }

  app.use(json({ limit: '100mb', type: 'application/json' }));
  app.use(
    urlencoded({
      extended: true,
      limit: '100mb',
      type: ['application/x-www-form-urlencoded', 'multipart/form-data'],
    }),
  );
  app.use(
    raw({
      limit: '100mb',
      type: ['application/x-tar', 'application/octet-stream'],
      inflate: false,
    }),
  );
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Backoffice Chatbot')
    .setDescription('Description API du Backoffice Chatbot')
    .setVersion('1.8')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'API - Chatbot',
  });

  await app.listen(3000);
}

bootstrap();
