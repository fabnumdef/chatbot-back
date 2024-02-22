import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import LoggerInterceptor from '@core/interceptors/logger.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import TimeoutInterceptor from '@core/interceptors/timeout.interceptor';
import * as path from 'path';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
// eslint-disable-next-line import/no-extraneous-dependencies
import { S3Module } from 'nestjs-s3';
import UserModule from './user/user.module';
import IntentModule from './intent/intent.module';
import AuthModule from './auth/auth.module';
import KnowledgeModule from './knowledge/knowledge.module';
import ResponseModule from './response/response.module';
import FileModule from './file/file.module';
import MediaModule from './media/media.module';
import InboxModule from './inbox/inbox.module';
import StatsModule from './stats/stats.module';
import RasaModule from './rasa/rasa.module';
import RefDataController from './ref-data/ref-data.controller';
import ChatbotConfigModule from './chatbot-config/chatbot-config.module';
import HealthController from './health/health.controller';
import * as ormconfig from './ormconfig';
import PublicController from './public/public.controller';
import PublicModule from './public/public.module';
import SharedModule from './shared/shared.module';
import FeedbackModule from './feedback/feedback.module';
import UpdateModule from './update/update.module';
import LoggerModule from './logger/logger.module';
import FaqModule from './faq/faq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(ormconfig),
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
  controllers: [RefDataController, HealthController, PublicController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export default class AppModule {}
