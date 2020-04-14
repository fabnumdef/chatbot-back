import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { KnowledgeService } from "./knowledge.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { KnowledgeDto } from "@core/dto/knowledge.dto";
import { plainToClass } from "class-transformer";
import { Knowledge } from "@core/entities/knowledge.entity";
import camelcaseKeys = require("camelcase-keys");
import snakecaseKeys = require("snakecase-keys");
import { KnowledgeModel } from "@core/models/knowledge.model";

@ApiTags('knowledge')
@Controller('knowledge')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class KnowledgeController {

  constructor(private readonly _knowledgeService: KnowledgeService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all knowledges' })
  async getKnowledges(): Promise<KnowledgeDto[]> {
    const knowledges: Knowledge[] = await this._knowledgeService.findAll();
    return plainToClass(KnowledgeDto, camelcaseKeys(knowledges, {deep: true}));
  }

  @Post('')
  @ApiOperation({ summary: 'Create a knowledge' })
  async createKnowledge(@Body() knowledge: KnowledgeDto): Promise<KnowledgeDto> {
    const knowledgeEntity = await this._knowledgeService.create(plainToClass(KnowledgeModel, snakecaseKeys(knowledge)));
    return plainToClass(KnowledgeDto, camelcaseKeys(knowledgeEntity, {deep: true}));
  }
}
