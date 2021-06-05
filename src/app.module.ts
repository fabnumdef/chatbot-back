import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { IntentModule } from './intent/intent.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ResponseModule } from './response/response.module';
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerInterceptor } from "@core/interceptors/logger.interceptor";
import { FileModule } from './file/file.module';
import { MediaModule } from './media/media.module';
import { InboxModule } from './inbox/inbox.module';
import { StatsModule } from './stats/stats.module';
import { ScheduleModule } from "@nestjs/schedule";
import { RasaModule } from './rasa/rasa.module';
import { RefDataController } from './ref-data/ref-data.controller';
import { ChatbotConfigModule } from './chatbot-config/chatbot-config.module';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import * as ormconfig from './ormconfig';
import { TimeoutInterceptor } from "@core/interceptors/timeout.interceptor";
import { PublicController } from './public/public.controller';
import { PublicModule } from './public/public.module';
import { SharedModule } from './shared/shared.module';
import * as path from "path";
import { MailerModule } from "@nestjs-modules/mailer";
import { FeedbackModule } from './feedback/feedback.module';
import { UpdateModule } from './update/update.module';
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { LoggerModule } from "./logger/logger.module";

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
        secure: true, // true for 465, false for other ports
        auth: {
          user: `${process.env.MAIL_USER}`,
          pass: `${process.env.MAIL_PASSWORD}`
        },
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false
        }
      },
      template: {
        dir: path.resolve(__dirname, '..', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
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
    LoggerModule
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
    }
  ],
})
export class AppModule {
}
