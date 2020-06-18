import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { PublicController } from "./public.controller";
import { ChatbotConfigModule } from "../chatbot-config/chatbot-config.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConfig]),
    ChatbotConfigModule
  ],
  controllers: [PublicController],
  providers: []
})
export class PublicModule {}
