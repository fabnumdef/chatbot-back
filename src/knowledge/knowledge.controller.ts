import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@core/guards/jwt.guard';
import { KnowledgeDto } from '@core/dto/knowledge.dto';
import { plainToInstance } from 'class-transformer';
import { Knowledge } from '@core/entities/knowledge.entity';
import camelcaseKeys = require('camelcase-keys');
import snakecaseKeys = require('snakecase-keys');
import { KnowledgeModel } from '@core/models/knowledge.model';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@Controller('knowledge')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class KnowledgeController {
  constructor(private readonly _knowledgeService: KnowledgeService) {}

  // @Get('')
  // @ApiOperation({ summary: 'Returne toute les questions similaires' })
  // async getKnowledges(): Promise<KnowledgeDto[]> {
  //   const knowledges: Knowledge[] = await this._knowledgeService.findAll();
  //   return plainToInstance(KnowledgeDto, camelcaseKeys(knowledges, {deep: true}));
  // }

  @Post('')
  @ApiOperation({ summary: "Création d'une question similaire" })
  async createKnowledge(
    @Body() knowledge: KnowledgeDto,
  ): Promise<KnowledgeDto> {
    const knowledgeEntity = await this._knowledgeService.create(
      plainToInstance(KnowledgeModel, snakecaseKeys(knowledge)),
    );
    return plainToInstance(
      KnowledgeDto,
      camelcaseKeys(knowledgeEntity, { deep: true }),
    );
  }
}
