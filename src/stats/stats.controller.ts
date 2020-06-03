import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { StatsService } from "./stats.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import snakecaseKeys = require("snakecase-keys");

@ApiTags('stats')
@Controller('stats')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class StatsController {
  constructor(private readonly _statsService: StatsService) {}

  @Get('linedata')
  @ApiOperation({ summary: 'Return data for line chart' })
  async sendLineData() {
    const result = {};
    result['askedQuestionsNumber'] = await this._statsService.getNbAskedQuestions();
    result['visitorNumber'] = await this._statsService.getNbVisitors();
    result['dbQuestionSize'] = await this._statsService.getNbIntent();
    return result;
  }

  @Get('bardata')
  @ApiOperation({ summary: 'Return data for bar chart' })
  async sendBarData() {
    const result = {};
    result['askedQuestionsNumber'] = await this._statsService.getNbAskedQuestions();
    return result;
  }

  @Get('bestdata')
  @ApiOperation({ summary: 'Return the most relevant data' })
  async sendBestData() {
    const result = {};
    result['mostAskedQuestions'] = 0;
    return result;
  }

  @Get('worstdata')
  @ApiOperation({ summary: 'Return the less revelant data' })
  async sendWorstData() {
    const result = {};
    result['lessAskedQuestions'] = 0;
    return result;
  }

  @Get('kpidata')
  @ApiOperation({ summary: 'Return kpi indicators' })
  async sendKPIData() {
    const result = {};
    result['uniqueVisitorsNumber'] = await this._statsService.getNbUniqueVisitors();
    result['avgQuestionPerVisitor'] = 9;
    result['avgChatbotResponseTime'] = 15;
    return result;
  }
}