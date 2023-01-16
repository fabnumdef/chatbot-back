import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import { urlencoded, json } from 'express';
import { AppModule } from "./app.module.js";
import { BotLogger } from "./logger/bot.logger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(BotLogger));
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300, // limit each IP to 300 requests per windowMs
    }),
  );
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));
  if(process.env.NODE_ENV === 'prod') {
    // app.enableCors({
    //   origin: process.env.HOST_URL
    // });
    app.enableCors();
  } else {
    app.enableCors();
  }
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));
  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Backoffice Chatbot')
    .setDescription('The backoffice chatbot factory API description')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'API - Chatbot'
  });

  await app.listen(3000);
}
bootstrap();
