import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Media } from "@core/entities/media.entity";
import { ResponseModule } from "../response/response.module";
import { IntentModule } from "../intent/intent.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    ResponseModule,
    IntentModule
  ],
  controllers: [MediaController],
  providers: [MediaService]
})
export class MediaModule {}
