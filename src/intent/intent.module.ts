import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Intent } from "../core/entities/intent.entity";
import { IntentService } from './intent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Intent])],
  controllers: [IntentController],
  providers: [IntentService]
})
export class IntentModule {}
