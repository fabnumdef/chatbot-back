import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Intent } from '@core/entities/intent.entity';
import IntentController from './intent.controller';
import IntentService from './intent.service';
import KnowledgeModule from '../knowledge/knowledge.module';
import ResponseModule from '../response/response.module';
import ChatbotConfigModule from '../chatbot-config/chatbot-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Intent]),
    KnowledgeModule,
    ResponseModule,
    ChatbotConfigModule,
  ],
  controllers: [IntentController],
  providers: [IntentService],
  exports: [IntentService],
})
export default class IntentModule {}
