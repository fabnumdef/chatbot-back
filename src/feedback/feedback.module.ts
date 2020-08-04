import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Feedback } from "@core/entities/feedback.entity";
import { InboxModule } from "../inbox/inbox.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    InboxModule
  ],
  providers: [FeedbackService],
  exports: [FeedbackService]
})
export class FeedbackModule {
}
