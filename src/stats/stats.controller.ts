import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StatsService } from "./stats.service";
import { StatsFilterDto } from "@core/dto/stats-filter.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { plainToClass } from "class-transformer";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";
import { StatsMostAskedCategoriesDto } from "@core/dto/stats-most-asked-categories.dto";
import { forkJoin } from "rxjs";

@ApiTags('stats')
@Controller('stats')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class StatsController {
  constructor(private readonly _statsService: StatsService) {}

  @Post('linedata')
  @ApiOperation({ summary: 'Return data for line chart' })
  async sendLineData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      askedQuestionsNumber: this._statsService.getNbAskedQuestions(filters),
      visitorNumber: this._statsService.getNbVisitors(filters),
      dbQuestionSize: this._statsService.getNbIntent(filters),
      feedbacksNumber: this._statsService.getNbFeedbacks(filters)
    });
  }

  @Post('bestdata')
  @ApiOperation({ summary: 'Return the most relevant data' })
  async sendBestData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getMostAskedQuestions(filters));
    return result;
  }

  @Post('best_categories')
  @ApiOperation({ summary: 'Return the most relevant categories' })
  async sendBestCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedCategoriesDto, await this._statsService.getMostAskedCategories(filters));
    return result;
  }

  @Post('worstdata')
  @ApiOperation({ summary: 'Return the less revelant data' })
  async sendWorstData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['lessAskedQuestions'] = await this._statsService.getNeverAskedQuestions(filters);
    return result;
  }

  @Post('kpidata')
  @ApiOperation({ summary: 'Return kpi indicators' })
  async sendKPIData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      uniqueVisitorsNumber: this._statsService.getNbUniqueVisitors(filters),
      avgQuestionPerVisitor: this._statsService.getAvgQuestPerVisitors(filters),
      avgChatbotResponseTime: this._statsService.getAvgResponseTime(filters),
      ratioChatbotResponseOk: this._statsService.getRatioResponseOk(filters),
      ratioChatbotResponseSure: this._statsService.getRatioResponseSure(filters)
    });
  }
}
