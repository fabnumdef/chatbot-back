import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtGuard from '@core/guards/jwt.guard';
import { IntentDto } from '@core/dto/intent.dto';
import { plainToInstance } from 'class-transformer';
import { Intent } from '@core/entities/intent.entity';
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { IntentFilterDto } from '@core/dto/intent-filter.dto';
import { IntentModel } from '@core/models/intent.model';
import { IntentStatus } from '@core/enums/intent-status.enum';
import camelcaseKeys = require('camelcase-keys');
import snakecaseKeys = require('snakecase-keys');
import IntentService from './intent.service';

@ApiTags('intent')
@Controller('intent')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class IntentController {
  constructor(private readonly intentService: IntentService) {}

  @Get('')
  @ApiOperation({ summary: 'Retourne toutes les connaissances' })
  async getIntents(): Promise<IntentDto[]> {
    const intents: Intent[] = await this.intentService.findFullIntents();
    return plainToInstance(IntentDto, camelcaseKeys(intents, { deep: true }));
  }

  @Get(':intentId')
  @ApiOperation({ summary: 'Retourne une connaissance' })
  async getIntent(@Param('intentId') intentId: string): Promise<IntentDto> {
    const intent: Intent = await this.intentService.findOne(intentId);
    return plainToInstance(
      IntentDto,
      camelcaseKeys(<any>intent, { deep: true }),
    );
  }

  @Get('check/:intentId')
  @ApiOperation({ summary: 'Vérifie si la connaissance existe' })
  async checkIntentId(@Param('intentId') intentId: string): Promise<boolean> {
    return this.intentService.intentExists(intentId);
  }

  @Post('search')
  @ApiOperation({ summary: 'Retourne les connaissances paginées' })
  async getIntentsPagination(
    @Query() options: PaginationQueryDto,
    @Body() filters: IntentFilterDto,
  ): Promise<IntentDto[]> {
    const intents: Pagination<IntentModel> = await this.intentService.paginate(
      options,
      filters,
    );
    intents.items
      .filter((i) => !!i)
      .map((i) =>
        plainToInstance(IntentDto, camelcaseKeys(<any>i, { deep: true })),
      );
    return camelcaseKeys(<any>intents, { deep: true });
  }

  @Post('')
  @ApiOperation({ summary: "Création d'une connaissance" })
  async createEditIntent(
    @Body() intentDto: IntentDto,
    @Req() req,
  ): Promise<IntentDto> {
    let intent = this.formatIntent(intentDto);
    intent.user = req.user;
    intent.status = IntentStatus.to_deploy;
    if (await this.intentService.intentExists(intent.id)) {
      throw new HttpException(
        `Impossible de créer cette connaissance, l'identifiant existe déjà.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    intent = await this.intentService.createEdit(intent, null);
    return plainToInstance(
      IntentDto,
      camelcaseKeys(<any>intent, { deep: true }),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: "Edition d'une connaissance" })
  async editIntent(
    @Param('id') intentId: string,
    @Body() intentDto: IntentDto,
  ): Promise<IntentDto> {
    let intent = this.formatIntent(intentDto);
    intent = await this.intentService.createEdit(
      intent,
      intent.id !== intentId ? intentId : null,
    );
    return plainToInstance(
      IntentDto,
      camelcaseKeys(<any>intent, { deep: true }),
    );
  }

  @Delete(':intentId')
  @ApiOperation({ summary: "Archivation d'une connaissance" })
  async deleteIntent(
    @Param('intentId') intentId: string,
  ): Promise<UpdateResult> {
    return this.intentService.delete(intentId);
  }

  @Post('tree')
  @ApiOperation({ summary: "Retour de l'arbre des connaissances" })
  async getIntentsTree(
    @Query() options: PaginationQueryDto,
    @Body() filters: IntentFilterDto,
  ): Promise<IntentDto[]> {
    const intents: Intent[] = await this.intentService.getFullTree(
      options,
      filters,
    );
    return plainToInstance(IntentDto, camelcaseKeys(intents, { deep: true }));
  }

  /**
   * Formattage d'une connaissance avant sa sauvegarde
   * @param intentDto
   * @private
   */
  private formatIntent(intentDto: IntentDto): Intent {
    const intent: Intent = plainToInstance(
      Intent,
      snakecaseKeys(<any>intentDto),
    );
    if (intent.responses.findIndex((r) => !r.id) >= 0) {
      // Si on ajoute une nouvelle réponse on supprime les ids des précédentes
      intent.responses.map((r) => {
        delete r.id;
        return r;
      });
    }
    intent.responses.map((r) => {
      // Association de la connaissance à la réponse pour la sauvegarde
      r.intent = <Intent>{ id: intent.id };
      return r;
    });
    if (intent.knowledges) {
      intent.knowledges = intent.knowledges.filter((k) => k.question.trim());
      intent.knowledges.map((k) => {
        // Association de la connaissance à la question similaire pour la sauvegarde
        k.intent = <Intent>{ id: intent.id };
        if (!k.id) {
          delete k.id;
        }
        return k;
      });
      // Filtre des questions similaires identiques
      intent.knowledges = intent.knowledges
        .reverse()
        .filter(
          (value, index, self) =>
            self.findIndex((k) => k.question === value.question) === index,
        );
    }
    return intent;
  }
}
