import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Events } from '@core/entities/events.entity';
import { Inbox } from '@core/entities/inbox.entity';
import InboxFillService from './inbox-fill.service';
import InboxController from './inbox.controller';
import InboxService from './inbox.service';
import KnowledgeModule from '../knowledge/knowledge.module';
import IntentModule from '../intent/intent.module';
import UserModule from '../user/user.module';
import SharedModule from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Events, Inbox]),
    KnowledgeModule,
    IntentModule,
    UserModule,
    SharedModule,
  ],
  providers: [InboxFillService, InboxService],
  controllers: [InboxController],
  exports: [InboxService],
})
export default class InboxModule {}
