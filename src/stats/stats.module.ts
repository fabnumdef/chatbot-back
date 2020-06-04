import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Events } from "@core/entities/events.entity";
import { Inbox } from "@core/entities/inbox.entity";
import { Intent } from "@core/entities/intent.entity";
import { Knowledge } from "@core/entities/knowledge.entity";
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { IntentModule } from "../intent/intent.module";
import { InboxModule } from "../inbox/inbox.module";

@Module({
  imports: [
    KnowledgeModule,
    InboxModule,
    IntentModule,
  ],
  providers: [StatsService],
  controllers: [StatsController]
})
export class StatsModule {
}
