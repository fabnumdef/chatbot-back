import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentService } from './intent.service';
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ResponseModule } from "../response/response.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Intent]),
    KnowledgeModule,
    ResponseModule
  ],
  controllers: [IntentController],
  providers: [IntentService],
  exports: [IntentService]
})
export class IntentModule {}
