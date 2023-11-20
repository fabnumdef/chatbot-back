import { forwardRef, Module } from '@nestjs/common';
import UpdateController from './update.controller';
import UpdateService from './update.service';
import ChatbotConfigModule from '../chatbot-config/chatbot-config.module';

@Module({
  imports: [forwardRef(() => ChatbotConfigModule)],
  controllers: [UpdateController],
  providers: [UpdateService],
  exports: [UpdateService],
})
export default class UpdateModule {}
