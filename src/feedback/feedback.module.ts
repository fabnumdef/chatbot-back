import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@core/entities/feedback.entity';
import FeedbackService from './feedback.service';
import InboxModule from '../inbox/inbox.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), InboxModule],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export default class FeedbackModule {}
