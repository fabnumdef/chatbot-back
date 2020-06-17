import { Controller, Get } from '@nestjs/common';
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { PublicConfigDto } from "@core/dto/public-config.dto";

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly _configService: ChatbotConfigService) {
  }

  @Get('')
  @ApiOperation({summary: 'Return the chatbot chatbot-config'})
  async getChabotConfig(): Promise<PublicConfigDto> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig(
      {select: ['name', 'icon', 'function', 'primary_color', 'secondary_color', 'problematic', 'audience']}
      );
    return config ? plainToClass(PublicConfigDto, camelcaseKeys(config, {deep: true})) : null;
  }
}
