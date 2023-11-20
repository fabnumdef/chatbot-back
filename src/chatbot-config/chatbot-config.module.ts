import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { ChatbotConfigController } from './chatbot-config.controller';
import { ChatbotConfigService } from './chatbot-config.service';
import { MediaModule } from '../media/media.module';
import { UpdateModule } from '../update/update.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConfig]),
    MediaModule,
    forwardRef(() => UpdateModule),
  ],
  controllers: [ChatbotConfigController],
  providers: [ChatbotConfigService],
  exports: [ChatbotConfigService],
})
export class ChatbotConfigModule {}
