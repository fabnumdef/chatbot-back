import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { FaqEvents } from "@core/entities/faq-events.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([FaqEvents]),
  ],
  providers: [FaqService],
  exports: [FaqService]
})
export class FaqModule {
}
