import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { IntentModule } from "../intent/intent.module";
import { InboxModule } from "../inbox/inbox.module";
import { FeedbackModule } from "../feedback/feedback.module";

@Module({
  imports: [
    KnowledgeModule,
    InboxModule,
    IntentModule,
    FeedbackModule
  ],
  providers: [StatsService],
  controllers: [StatsController]
})
export class StatsModule {
}
