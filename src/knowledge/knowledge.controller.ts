import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { KnowledgeService } from "./knowledge.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { KnowledgeDto } from "@core/dto/knowledge.dto";

@ApiTags('knowledge')
@Controller('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class KnowledgeController {

  constructor(private readonly _knowledgeService: KnowledgeService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all knowledges' })
  async getKnowledges(): Promise<KnowledgeDto[]> {
    return this._knowledgeService.findAll();
  }

  @Post('')
  @ApiOperation({ summary: 'Create a knowledge' })
  async createKnowledge(@Body() knowledge: KnowledgeDto): Promise<KnowledgeDto> {
    return this._knowledgeService.create(knowledge);
  }
}
