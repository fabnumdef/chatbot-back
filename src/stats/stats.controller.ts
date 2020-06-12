import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { StatsService } from "./stats.service";
import { StatsFilterDto } from "@core/dto/stats-filter.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import * as moment from 'moment';
import snakecaseKeys = require("snakecase-keys");

@ApiTags('stats')
@Controller('stats')
@ApiBearerAuth()
//@UseGuards(JwtGuard)
export class StatsController {
  constructor(private readonly _statsService: StatsService) {}

  @Post('linedata')
  @ApiOperation({ summary: 'Return data for line chart' })
  async sendLineData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['askedQuestionsNumber'] = await this._statsService.getNbAskedQuestions(filters);
    result['visitorNumber'] = await this._statsService.getNbVisitors(filters);
    result['dbQuestionSize'] = await this._statsService.getNbIntent(filters);
    return result;
  }

  @Post('bardata')
  @ApiOperation({ summary: 'Return data for bar chart' })
  async sendBarData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['askedQuestionsNumber'] = await this._statsService.getNbAskedQuestions(filters);
    return result;
  }

  @Post('bestdata')
  @ApiOperation({ summary: 'Return the most relevant data' })
  async sendBestData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = await this._statsService.getMostAskedQuestions(filters);
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

  @Post('test')
  @ApiOperation({ summary: 'test return filters' })
  async getFilters(@Body() filters: StatsFilterDto) {
    const result = new Date(moment(filters.endDate).year(), moment(filters.endDate).month(), Number(moment(filters.endDate).format('DD'))).toLocaleDateString();
    return result;
  }
}