import { Module } from '@nestjs/common';
import { InboxFillService } from "./inbox-fill.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Events } from "@core/entities/events.entity";
import { Inbox } from "@core/entities/inbox.entity";
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { IntentModule } from "../intent/intent.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Events, Inbox]),
    KnowledgeModule,
    IntentModule
  ],
  providers: [InboxFillService, InboxService],
  controllers: [InboxController],
  exports: [InboxService],
})
export class InboxModule {
}
