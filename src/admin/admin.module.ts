import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileHistoric } from '@core/entities/file.entity';
import KnowledgeModule from 'src/knowledge/knowledge.module';
import MediaModule from '../media/media.module';
import FaqModule from '../faq/faq.module';
import ResponseModule from '../response/response.module';
import AdminController from './admin.controller';
import AdminService from './admin.service';
import IntentModule from '../intent/intent.module';
import InboxModule from '../inbox/inbox.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [
    KnowledgeModule,
    InboxModule,
    ResponseModule,
    MediaModule,
    FaqModule,
    IntentModule,
    TypeOrmModule.forFeature([FileHistoric]),
  ],
})
export default class AdminModule {}
