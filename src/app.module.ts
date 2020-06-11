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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(ormconfig),
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
    TerminusModule
  ],
  controllers: [RefDataController, HealthController],
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
