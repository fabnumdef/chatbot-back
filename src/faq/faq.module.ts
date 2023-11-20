import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqEvents } from '@core/entities/faq-events.entity';
import FaqService from './faq.service';

@Module({
  imports: [TypeOrmModule.forFeature([FaqEvents])],
  providers: [FaqService],
  exports: [FaqService],
})
export default class FaqModule {}
