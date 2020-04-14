import { Module } from '@nestjs/common';
import { RasaController } from './rasa.controller';
import { RasaService } from './rasa.service';
import { IntentModule } from "../intent/intent.module";

@Module({
  controllers: [RasaController],
  providers: [RasaService],
  imports: [
    IntentModule
  ]
})
export class RasaModule {}
