import { Module } from '@nestjs/common';
import { InboxFillService } from "./inbox-fill.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Events } from "@core/entities/events.entity";
import { Inbox } from "@core/entities/inbox.entity";
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { KnowledgeModule } from "../knowledge/knowledge.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Events, Inbox]),
    KnowledgeModule
  ],
  providers: [InboxFillService, InboxService],
  controllers: [InboxController]
})
export class InboxModule {
}
