import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { KnowledgeService } from "./knowledge.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { KnowledgeDto } from "@core/dto/knowledge.dto";
import { plainToClass } from "class-transformer";
import { Knowledge } from "@core/entity/knowledge.entity";
import camelcaseKeys = require("camelcase-keys");

@ApiTags('knowledge')
@Controller('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
    knowledge = await this._knowledgeService.create(knowledge);
    return plainToClass(KnowledgeDto, camelcaseKeys(knowledge, {deep: true}));
  }
}
