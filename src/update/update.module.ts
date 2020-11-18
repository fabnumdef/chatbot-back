import { Module } from '@nestjs/common';
import { UpdateController } from './update.controller';
import { UpdateService } from './update.service';
import { ChatbotConfigModule } from "../chatbot-config/chatbot-config.module";

@Module({
  imports: [
    ChatbotConfigModule
  ],
  controllers: [UpdateController],
  providers: [UpdateService]
})
export class UpdateModule {}
