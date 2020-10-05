import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { ChatbotConfigService } from "./chatbot-config.service";
import { plainToClass } from "class-transformer";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { ConfigDto } from "@core/dto/config.dto";
import camelcaseKeys = require("camelcase-keys");
import snakecaseKeys = require("snakecase-keys");
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { MediaService } from "../media/media.service";
import { ConfigUpdateDto } from "@core/dto/config-update.dto";
import { RolesGuard } from "@core/guards/roles.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@core/enums/user-role.enum";

@ApiTags('config')
@Controller('config')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class ChatbotConfigController {

  constructor(private readonly _configService: ChatbotConfigService,
              private readonly _mediaService: MediaService) {
    this._configService.updateFrontManifest();
  }

  @Get('')
  @ApiOperation({summary: 'Return the chatbot chatbot-config'})
  async getChabotConfig(): Promise<ConfigDto> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig();
    return config ? plainToClass(ConfigDto, camelcaseKeys(config, {deep: true})) : null;
  }

  @Post('')
  @UseInterceptors(
    FileFieldsInterceptor([
      {name: 'icon', maxCount: 1},
      {name: 'embeddedIcon', maxCount: 1},
    ], {
      limits: {
        // 5Mb
        fileSize: 5e+6
      },
      fileFilter: ChatbotConfigService.imageFileFilter,
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Set the chatbot config',
    type: ConfigUpdateDto,
  })
  @ApiOperation({summary: 'Set the chatbot config'})
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  async setChatbotConfig(@UploadedFiles() files,
                         @Body() chatbotConfig: ConfigUpdateDto): Promise<ConfigDto> {
    const icon = files.icon ? files.icon[0] : null;
    await this._configService.delete();
    const iconName = icon ? await this._mediaService.storeFile(icon) : '';
    const configEntity = await this._configService.save(plainToClass(ChatbotConfig, snakecaseKeys({...chatbotConfig, ...{icon: iconName}})));
    await this._configService.updateFrontManifest();
    return plainToClass(ConfigDto, camelcaseKeys(configEntity, {deep: true}));
  }

  @Put('')
  @UseInterceptors(
    FileFieldsInterceptor([
      {name: 'icon', maxCount: 1},
      {name: 'embeddedIcon', maxCount: 1},
    ], {
      limits: {
        // 5Mb
        fileSize: 5e+6
      },
      fileFilter: ChatbotConfigService.imageFileFilter,
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({summary: 'Update the chatbot config'})
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  async updateChatbotConfig(@UploadedFiles() files,
                            @Body() chatbotConfig: ConfigUpdateDto): Promise<ConfigDto> {
    let botConfig: any = chatbotConfig;
    const icon = files.icon ? files.icon[0] : null;
    const embeddedIcon = files.embeddedIcon ? files.embeddedIcon[0] : null;
    if (icon) {
      await this._configService.delete(false);
      const iconName = await this._mediaService.storeFile(icon);
      botConfig = {...chatbotConfig, ...{icon: iconName}};
    }
    if (embeddedIcon) {
      await this._configService.delete(false, true);
      const embeddedIconName = await this._mediaService.storeFile(embeddedIcon);
      botConfig = {...chatbotConfig, ...{embeddedIcon: embeddedIconName}};
    }
    const configEntity = await this._configService.update(plainToClass(ChatbotConfig, snakecaseKeys(botConfig)));
    if (icon || botConfig.name) {
      await this._configService.updateFrontManifest();
    }
    return plainToClass(ConfigDto, camelcaseKeys(configEntity, {deep: true}));
  }
}
