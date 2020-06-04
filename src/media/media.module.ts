import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Media } from "@core/entities/media.entity";
import { ResponseModule } from "../response/response.module";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { Intent } from "@core/entities/intent.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, ChatbotConfig, Intent]),
    ResponseModule
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService]
})
export class MediaModule {}
