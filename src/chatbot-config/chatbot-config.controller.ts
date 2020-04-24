import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { ChatbotConfigService } from "./chatbot-config.service";
import { plainToClass } from "class-transformer";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { ConfigDto } from "@core/dto/config.dto";
import camelcaseKeys = require("camelcase-keys");
import snakecaseKeys = require("snakecase-keys");

@ApiTags('config')
@Controller('config')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class ChatbotConfigController {

  constructor(private readonly _configService: ChatbotConfigService) {
  }

  @Get('')
  @ApiOperation({ summary: 'Return the chatbot chatbot-config' })
  async getChabotConfig(): Promise<ConfigDto> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig();
    return plainToClass(ConfigDto, camelcaseKeys(config, {deep: true}));
  }

  @Post('')
  @ApiOperation({ summary: 'Update the chatbot chatbot-config' })
  async setChatbotConfig(@Body() chatbotConfig: ConfigDto): Promise<ConfigDto> {
    const configEntity = await this._configService.save(plainToClass(ChatbotConfig, snakecaseKeys(chatbotConfig)));
    return plainToClass(ConfigDto, camelcaseKeys(configEntity, {deep: true}));
  }
}
