import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Media } from "@core/entities/media.entity";
import { ResponseModule } from "../response/response.module";
import { IntentModule } from "../intent/intent.module";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    TypeOrmModule.forFeature([ChatbotConfig]),
    ResponseModule,
    IntentModule
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService]
})
export class MediaModule {}
