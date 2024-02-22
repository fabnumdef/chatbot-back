import { Module } from '@nestjs/common';
import RasaController from './rasa.controller';
import RasaService from './rasa.service';
import IntentModule from '../intent/intent.module';
import FileModule from '../file/file.module';
import ChatbotConfigModule from '../chatbot-config/chatbot-config.module';
import RasaActionsController from './rasa-actions.controller';

@Module({
  controllers: [RasaController, RasaActionsController],
  providers: [RasaService],
  imports: [IntentModule, FileModule, ChatbotConfigModule],
})
export default class RasaModule {}
