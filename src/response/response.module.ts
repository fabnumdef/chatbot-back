import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from '@core/entities/response.entity';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import ResponseService from './response.service';
import ResponseController from './response.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Response, ChatbotConfig])],
  controllers: [ResponseController],
  providers: [ResponseService],
  exports: [ResponseService],
})
export default class ResponseModule {}
