import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtGuard from '@core/guards/jwt.guard';
import { KnowledgeDto } from '@core/dto/knowledge.dto';
import { plainToInstance } from 'class-transformer';
import { KnowledgeModel } from '@core/models/knowledge.model';
import camelcaseKeys = require('camelcase-keys');
import * as snakecaseKeys from 'snakecase-keys';
import KnowledgeService from './knowledge.service';

@ApiTags('knowledge')
@Controller('knowledge')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // @Get('')
  // @ApiOperation({ summary: 'Returne toute les questions similaires' })
  // async getKnowledges(): Promise<KnowledgeDto[]> {
  //   const knowledges: Knowledge[] = await this.knowledgeService.findAll();
  //   return plainToInstance(KnowledgeDto, camelcaseKeys(knowledges, {deep: true}));
  // }

  @Post('')
  @ApiOperation({ summary: "Création d'une question similaire" })
  async createKnowledge(
    @Body() knowledge: KnowledgeDto,
  ): Promise<KnowledgeDto> {
    const knowledgeEntity = await this.knowledgeService.create(
      plainToInstance(KnowledgeModel, snakecaseKeys(<any>knowledge)),
    );
    return plainToInstance(
      KnowledgeDto,
      camelcaseKeys(<any>knowledgeEntity, { deep: true }),
    );
  }
}
