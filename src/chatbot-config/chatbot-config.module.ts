import { Module } from '@nestjs/common';
import { ChatbotConfigController } from './chatbot-config.controller';
import { ChatbotConfigService } from './chatbot-config.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ChatbotConfig])],
  controllers: [ChatbotConfigController],
  providers: [ChatbotConfigService]
})
export class ChatbotConfigModule {}
