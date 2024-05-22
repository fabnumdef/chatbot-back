import LoggerInterceptor from '@core/interceptors/logger.interceptor';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from 'nestjs-s3';
import * as path from 'path';
import {CacheModule} from "@nestjs/cache-manager";
import AuthModule from './auth/auth.module';
import ChatbotConfigModule from './chatbot-config/chatbot-config.module';
import { dataSource } from './data-source';
import FaqModule from './faq/faq.module';
import FeedbackModule from './feedback/feedback.module';
import FileModule from './file/file.module';
import HealthController from './health/health.controller';
import InboxModule from './inbox/inbox.module';
import IntentModule from './intent/intent.module';
import KnowledgeModule from './knowledge/knowledge.module';
import LoggerModule from './logger/logger.module';
import MediaModule from './media/media.module';
import PublicController from './public/public.controller';
import PublicModule from './public/public.module';
import RasaModule from './rasa/rasa.module';
import RefDataController from './ref-data/ref-data.controller';
import ResponseModule from './response/response.module';
import SharedModule from './shared/shared.module';
import StatsModule from './stats/stats.module';
import UpdateModule from './update/update.module';
import UserModule from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register(),
    TypeOrmModule.forRoot(dataSource.options),
    MailerModule.forRoot({
      transport: {
        host: `${process.env.MAIL_HOST}`,
        port: `${process.env.MAIL_PORT}`,
        // true for 465, false for other ports
        secure: process.env.MAIL_SECURE
          ? process.env.MAIL_SECURE === 'true' // If the MAIL_SECURE env var is defined check its value
          : !process.env.INTRADEF || process.env.INTRADEF === 'false', // Else use default value
        auth: {
          user: `${process.env.MAIL_USER}`,
          pass: `${process.env.MAIL_PASSWORD}`,
        },
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false,
        },
      },
      template: {
        dir: path.resolve(__dirname, '..', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    S3Module.forRoot({
      config: {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_DEFAULT_REGION,
        endpoint: process.env.AWS_ENDPOINT_URL,
      },
    }),
    AuthModule,
    UserModule,
    IntentModule,
    KnowledgeModule,
    ResponseModule,
    FileModule,
    MediaModule,
    InboxModule,
    StatsModule,
    ScheduleModule.forRoot(),
    RasaModule,
    ChatbotConfigModule,
    TerminusModule,
    PublicModule,
    SharedModule,
    FeedbackModule,
    UpdateModule,
    LoggerModule,
    FaqModule,
  ],
  controllers: [RefDataController, HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
  ],
})
export default class AppModule {}
