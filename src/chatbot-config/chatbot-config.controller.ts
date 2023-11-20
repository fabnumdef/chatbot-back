import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import JwtGuard from '@core/guards/jwt.guard';
import { plainToInstance } from 'class-transformer';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { ConfigDto } from '@core/dto/config.dto';
import camelcaseKeys = require('camelcase-keys');
import snakecaseKeys = require('snakecase-keys');
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ConfigUpdateDto } from '@core/dto/config-update.dto';
import RolesGuard from '@core/guards/roles.guard';
import { Roles } from '@core/decorators/roles.decorator';
import { UserRole } from '@core/enums/user-role.enum';
import ApiKeyGuard from '@core/guards/api-key.guard';
import { UpdateDomainNameDto } from '@core/dto/update-chatbot.dto';
import MediaService from '../media/media.service';
import ChatbotConfigService from './chatbot-config.service';
import UpdateService from '../update/update.service';

@ApiTags('config')
@Controller('config')
export default class ChatbotConfigController {
  constructor(
    private readonly configService: ChatbotConfigService,
    private readonly updateService: UpdateService,
    private readonly mediaService: MediaService,
  ) {
    this.configService.updateFrontManifest();
    // Lors du démarrage de l'application, si celle-ci a été KO de force on reboot certains paramètres pour éviter le blocage de certaines mises à jour
    this.configService.update(<ChatbotConfig>{
      is_blocked: false,
      training_rasa: false,
      need_update: false,
    });
  }

  @Get('')
  @ApiOperation({ summary: 'Retourne la configuration du chatbot' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async getChabotConfig(): Promise<ConfigDto> {
    const config: ChatbotConfig = await this.configService.getChatbotConfig();
    return config
      ? plainToInstance(ConfigDto, camelcaseKeys(<any>config, { deep: true }))
      : null;
  }

  @Post('')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'icon', maxCount: 1 },
        { name: 'embeddedIcon', maxCount: 1 },
      ],
      {
        limits: {
          // 5Mb
          fileSize: 5e6,
        },
        fileFilter: ChatbotConfigService.imageFileFilter,
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sauvegarde la configuration du chatbot' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  async setChatbotConfig(
    @UploadedFiles() files,
    @Body() chatbotConfig: ConfigUpdateDto,
  ): Promise<ConfigDto> {
    const icon = files.icon ? files.icon[0] : null;
    await this.configService.delete();
    const iconName = icon ? await this.mediaService.storeFile(icon) : '';
    const configEntity = await this.configService.save(
      plainToInstance(
        ChatbotConfig,
        snakecaseKeys({ ...chatbotConfig, ...{ icon: iconName } }),
      ),
    );
    await this.configService.updateFrontManifest();
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>configEntity, { deep: true }),
    );
  }

  @Put('')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'icon', maxCount: 1 },
        { name: 'embeddedIcon', maxCount: 1 },
      ],
      {
        limits: {
          // 5Mb
          fileSize: 5e6,
        },
        fileFilter: ChatbotConfigService.imageFileFilter,
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Met à jour la configuration du chatbot' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  async updateChatbotConfig(
    @UploadedFiles() files,
    @Body() chatbotConfig: ConfigUpdateDto,
  ): Promise<ConfigDto> {
    let botConfig: any = chatbotConfig;
    [
      'showIntentSearch',
      'dismissQuickReplies',
      'showFeedback',
      'blockTypeText',
      'showRebootBtn',
      'isTree',
      'showFaq',
      'showFallbackSuggestions',
    ].forEach((attribute) => {
      if (chatbotConfig[attribute]) {
        chatbotConfig[attribute] = chatbotConfig[attribute] == 'true';
      }
    });
    const icon = files.icon ? files.icon[0] : null;
    const embeddedIcon = files.embeddedIcon ? files.embeddedIcon[0] : null;
    if (icon) {
      await this.configService.delete(false);
      const iconName = await this.mediaService.storeFile(icon);
      botConfig = { ...chatbotConfig, ...{ icon: iconName } };
    }
    if (embeddedIcon) {
      await this.configService.delete(false, true);
      const embeddedIconName = await this.mediaService.storeFile(embeddedIcon);
      botConfig = { ...chatbotConfig, ...{ embeddedIcon: embeddedIconName } };
    }

    const configEntity = await this.configService.update(
      plainToInstance(ChatbotConfig, snakecaseKeys(botConfig)),
    );
    if (icon || botConfig.name) {
      await this.configService.updateFrontManifest();
    }
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>configEntity, { deep: true }),
    );
  }

  @Post('api-key')
  @ApiOperation({ summary: "Met à jour l'api-key" })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async updateApiKey(): Promise<ConfigDto> {
    await this.configService.updateApiKey();
    const config = await this.configService.getChatbotConfig();
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>config, { deep: true }),
    );
  }

  @Get('training')
  @ApiOperation({ summary: "Retourne si l'IA est en entraînement" })
  @UseGuards(ApiKeyGuard)
  async isChatbotTraining(): Promise<boolean> {
    const config: ChatbotConfig = await this.configService.getChatbotConfig();
    return config.training_rasa;
  }

  @Put('block')
  @ApiOperation({ summary: "Bloque le chatbot pour l'entraînement de l'IA" })
  @UseGuards(ApiKeyGuard)
  async updateBlockChatbot(
    @Body() isBlocked: { isBlocked: boolean },
  ): Promise<ConfigDto> {
    if (await this.isChatbotTraining()) {
      throw new HttpException(
        `Le chatbot est entrain d'être mis à jour. Merci de patienter quelques minutes.`,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
    const configEntity = await this.configService.update(
      plainToInstance(ChatbotConfig, snakecaseKeys(isBlocked)),
    );
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>configEntity, { deep: true }),
    );
  }

  @Put('maintenance')
  @ApiOperation({ summary: 'Met à jour le mode maintenance' })
  @UseGuards(ApiKeyGuard)
  async updateMaintenanceMode(
    @Body() maintenanceMode: { maintenanceMode: boolean },
  ): Promise<ConfigDto> {
    const configEntity = await this.configService.update(
      plainToInstance(ChatbotConfig, snakecaseKeys(maintenanceMode)),
    );
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>configEntity, { deep: true }),
    );
  }

  @Post('domain-name')
  @ApiOperation({ summary: 'Met à jour le nom de domaine' })
  @UseGuards(ApiKeyGuard)
  async updateDomainName(@Body() updateDomainName: UpdateDomainNameDto) {
    await this.updateService.updateDomainName(updateDomainName);
    const configEntity = await this.configService.update(
      plainToInstance(ChatbotConfig, {
        domainName: updateDomainName.domainName,
      }),
    );
    return plainToInstance(
      ConfigDto,
      camelcaseKeys(<any>configEntity, { deep: true }),
    );
  }
}
