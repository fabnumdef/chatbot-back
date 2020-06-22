import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { IntentModule } from "../intent/intent.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ResponseModule } from "../response/response.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileHistoric } from "@core/entities/file.entity";
import { ChatbotConfigModule } from "../chatbot-config/chatbot-config.module";

@Module({
  controllers: [FileController],
  providers: [FileService],
  imports: [
    IntentModule,
    KnowledgeModule,
    ResponseModule,
    TypeOrmModule.forFeature([FileHistoric]),
    ChatbotConfigModule
  ],
  exports: [
    FileService
  ]
})
export class FileModule {
}
