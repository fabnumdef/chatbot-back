import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StatsService } from "./stats.service";
import { StatsFilterDto } from "@core/dto/stats-filter.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { plainToClass } from "class-transformer";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";
import { StatsMostAskedCategoriesDto } from "@core/dto/stats-most-asked-categories.dto";
import { forkJoin } from "rxjs";
import { FeedbackStatus } from "@core/enums/feedback-status.enum";
import { ApiKeyGuard } from "@core/guards/api-key.guard";

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly _statsService: StatsService) {}

  @Post('line_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return data for line chart'})
  async sendLineData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      askedQuestionsNumber: this._statsService.getNbAskedQuestions(filters),
      visitorNumber: this._statsService.getNbVisitors(filters),
      dbQuestionSize: this._statsService.getNbIntent(filters),
      feedbacksNumber: this._statsService.getNbFeedbacks(filters)
    });
  }

  @Post('best_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most relevant data'})
  async sendBestData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getMostAskedQuestions(filters));
    return result;
  }

  @Post('best_categories')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most relevant categories'})
  async sendBestCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedCategoriesDto, await this._statsService.getMostAskedCategories(filters));
    return result;
  }

  @Post('worst_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the less revelant data'})
  async sendWorstData(@Body() filters: StatsFilterDto) {
    const result = {};
    result['lessAskedQuestions'] = await this._statsService.getNeverAskedQuestions(filters);
    return result;
  }

  @Post('kpi_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return kpi indicators'})
  async sendKPIData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      uniqueVisitorsNumber: this._statsService.getNbUniqueVisitors(filters),
      avgQuestionPerVisitor: this._statsService.getAvgQuestPerVisitors(filters),
      avgChatbotResponseTime: this._statsService.getAvgResponseTime(filters),
      ratioChatbotResponseOk: this._statsService.getRatioResponseOk(filters),
      ratioChatbotResponseSure: this._statsService.getRatioResponseSure(filters)
    });
  }

  @Post('faq_most_questions')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most relevant questions for FAQ'})
  async sendFaqMostQuestions(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFaqMostAskedQuestions(filters));
    return result;
  }

  @Post('faq_most_categories')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most relevant categories for FAQ'})
  async sendFaqMostCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedCategoriesDto, await this._statsService.getFaqMostAskedCategories(filters));
    return result;
  }

  @Post('faq_kpi_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return faq kpi indicators'})
  async sendFaqKPIData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      uniqueVisitorsNumber: this._statsService.getFaqNbUniqueVisitors(filters),
      avgQuestionPerVisitor: this._statsService.getFaqAvgQuestPerVisitors(filters)
    });
  }

  @Post('feedback_relevant_questions')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged relevant questions'})
  async sendFeedbackRelevantQuestions(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackQuestions(filters, FeedbackStatus.relevant));
    return result;
  }

  @Post('feedback_relevant_categories')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged relevant categories'})
  async sendFeedbackRelevantCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackCategories(filters, FeedbackStatus.relevant));
    return result;
  }

  @Post('feedback_wrong_questions')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged wrong questions'})
  async sendFeedbackWrongQuestions(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackQuestions(filters, FeedbackStatus.wrong));
    return result;
  }

  @Post('feedback_wrong_categories')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged wrong categories'})
  async sendFeedbackWrongCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackCategories(filters, FeedbackStatus.wrong));
    return result;
  }

  @Post('feedback_off_topic_questions')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged off_topic questions'})
  async sendFeedbackOfftopicQuestions(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedQuestions'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackQuestions(filters, FeedbackStatus.off_topic));
    return result;
  }

  @Post('feedback_off_topic_categories')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return the most flaged off_topic categories'})
  async sendFeedbackOfftopicCategories(@Body() filters: StatsFilterDto) {
    const result = {};
    result['mostAskedCategories'] = plainToClass(StatsMostAskedQuestionsDto, await this._statsService.getFeedbackCategories(filters, FeedbackStatus.off_topic));
    return result;
  }

  @Post('feedback_kpi_data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({summary: 'Return feedback kpi indicators'})
  async sendFeedbackKPIData(@Body() filters: StatsFilterDto) {
    return forkJoin({
      relevantQuestions: this._statsService.getFeedbackKpi(filters, FeedbackStatus.relevant),
      relevantQuestionsPct: this._statsService.getFeedbackPctKpi(filters, FeedbackStatus.relevant),
      wrongQuestions: this._statsService.getFeedbackKpi(filters, FeedbackStatus.wrong),
      wrongQuestionsPct: this._statsService.getFeedbackPctKpi(filters, FeedbackStatus.wrong),
      offtopicQuestions: this._statsService.getFeedbackKpi(filters, FeedbackStatus.off_topic),
      offtopicQuestionsPct: this._statsService.getFeedbackPctKpi(filters, FeedbackStatus.off_topic)
    });
  }

  @Post('external_data')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({summary: 'Return external stats'})
  async sendExternalData() {
    return forkJoin({
      askedQuestionsNumber: this._statsService.getNbAskedQuestions(null),
      visitorNumber: this._statsService.getNbVisitors(null),
      dbQuestionSize: this._statsService.getNbIntent(null),
      ratioChatbotResponseOk: this._statsService.getRatioResponseOk(null),
    });
  }
}
