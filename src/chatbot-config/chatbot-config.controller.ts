import { Body, Controller, Get, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { ChatbotConfigService } from "./chatbot-config.service";
import { plainToClass } from "class-transformer";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { ConfigDto } from "@core/dto/config.dto";
import camelcaseKeys = require("camelcase-keys");
import snakecaseKeys = require("snakecase-keys");
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService } from "../media/media.service";
import { ConfigUpdateDto } from "@core/dto/config-update.dto";

@ApiTags('config')
@Controller('config')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class ChatbotConfigController {

  constructor(private readonly _configService: ChatbotConfigService,
              private readonly _mediaService: MediaService) {
  }

  @Get('')
  @ApiOperation({summary: 'Return the chatbot chatbot-config'})
  async getChabotConfig(): Promise<ConfigDto> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig();
    return config ? plainToClass(ConfigDto, camelcaseKeys(config, {deep: true})) : null;
  }

  @Post('')
  @UseInterceptors(
    FileInterceptor(
      'icon',
      {
        limits: {
          // 5Mb
          fileSize: 5e+6
        },
        fileFilter: ChatbotConfigService.imageFileFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({summary: 'Set the chatbot config'})
  async setChatbotConfig(@UploadedFile() icon,
                         @Body() chatbotConfig: ConfigDto): Promise<ConfigDto> {
    await this._configService.delete();
    const iconName = await this._mediaService.storeFile(icon);
    const configEntity = await this._configService.save(plainToClass(ChatbotConfig, snakecaseKeys({...chatbotConfig, ...{icon: iconName}})));
    return plainToClass(ConfigDto, camelcaseKeys(configEntity, {deep: true}));
  }

  @Put('')
  @UseInterceptors(
    FileInterceptor(
      'icon',
      {
        limits: {
          // 5Mb
          fileSize: 5e+6
        },
        fileFilter: ChatbotConfigService.imageFileFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({summary: 'Update the chatbot config'})
  async updateChatbotConfig(@UploadedFile() icon,
                            @Body() chatbotConfig: ConfigUpdateDto): Promise<ConfigDto> {
    let botConfig: any = chatbotConfig;
    if (icon) {
      await this._configService.delete(false);
      const iconName = await this._mediaService.storeFile(icon);
      botConfig = {...chatbotConfig, ...{icon: iconName}};
    }
    const configEntity = await this._configService.save(plainToClass(ChatbotConfig, snakecaseKeys(botConfig)));
    return plainToClass(ConfigDto, camelcaseKeys(configEntity, {deep: true}));
  }
}
