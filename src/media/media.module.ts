import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from '@core/entities/media.entity';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { Intent } from '@core/entities/intent.entity';
import ResponseModule from '../response/response.module';
import MediaService from './media.service';
import MediaController from './media.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, ChatbotConfig, Intent]),
    ResponseModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export default class MediaModule {}
