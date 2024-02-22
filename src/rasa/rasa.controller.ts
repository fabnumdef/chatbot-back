import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import JwtGuard from '@core/guards/jwt.guard';
import ChatbotConfigService from 'src/chatbot-config/chatbot-config.service';
import RasaService from './rasa.service';

@ApiTags('rasa')
@Controller('rasa')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class RasaController {
  constructor(
    private readonly rasaService: RasaService,
    private readonly configService: ChatbotConfigService,
  ) {}

  @Post('train')
  @ApiOperation({
    summary:
      'Converti la base de connaissances en fichiers RASA & entraine le Chatbot',
  })
  async trainRasa(): Promise<void> {
    await this.configService.update(<ChatbotConfig>{ training_rasa: false });

    if (!(await this.rasaService.canTrainRasa())) {
      throw new HttpException(
        `Le chatbot est déjà entrain d'être mis à jour. Merci de patienter quelques minutes.`,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    await this.rasaService.trainRasa();
  }
}
