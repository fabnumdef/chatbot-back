import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtGuard from '@core/guards/jwt.guard';
import { plainToInstance } from 'class-transformer';
import { StatsMostAskedQuestionsDto } from '@core/dto/stats-most-asked-questions.dto';
import { StatsMostAskedCategoriesDto } from '@core/dto/stats-most-asked-categories.dto';
import { forkJoin } from 'rxjs';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';
import StatsService from './stats.service';

@ApiTags('stats')
@Controller('stats')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Post('line_data')
  @ApiOperation({
    summary: 'Retourne les données pour les graphiques linéaires',
  })
  async sendLineData(@Body() filters: StatsFilterDto) {
    // TODO Deprecated
    return forkJoin({
      askedQuestionsNumber: this.statsService.getNbAskedQuestions(filters),
      visitorNumber: this.statsService.getNbVisitors(filters),
      dbQuestionSize: this.statsService.getNbIntent(filters),
      feedbacksNumber: this.statsService.getNbFeedbacks(filters),
    });
  }

  @Post('best_data')
  @ApiOperation({ summary: 'Retourne les connaissances les plus demandées' })
  async sendBestData(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedQuestions = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getMostAskedQuestions(filters),
    );
    return result;
  }

  @Post('best_categories')
  @ApiOperation({ summary: 'Retourne les catégories les plus demandées' })
  async sendBestCategories(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedCategories = plainToInstance(
      StatsMostAskedCategoriesDto,
      await this.statsService.getMostAskedCategories(filters),
    );
    return result;
  }

  @Post('worst_data')
  @ApiOperation({ summary: 'Retourne les connaissances les moins demandées' })
  async sendWorstData(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.lessAskedQuestions =
      await this.statsService.getNeverAskedQuestions(filters);
    return result;
  }

  @Post('kpi_data')
  @ApiOperation({ summary: 'Retourne les KPIs' })
  async sendKPIData(@Body() filters: StatsFilterDto) {
    // TODO Deprecated
    return forkJoin({
      uniqueVisitorsNumber: this.statsService.getNbUniqueVisitors(filters),
      avgQuestionPerVisitor: this.statsService.getAvgQuestPerVisitors(filters),
      avgChatbotResponseTime: this.statsService.getAvgResponseTime(filters),
      ratioChatbotResponseOk: this.statsService.getRatioResponseOk(filters),
      ratioChatbotResponseSure: this.statsService.getRatioResponseSure(filters),
    });
  }

  @Post('faq_most_questions')
  @ApiOperation({
    summary: 'Retourne les connaissances les plus demandées via la FAQ',
  })
  async sendFaqMostQuestions(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedQuestions = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFaqMostAskedQuestions(filters),
    );
    return result;
  }

  @Post('faq_most_categories')
  @ApiOperation({
    summary: 'Retourne les catégories les plus demandées via la FAQ',
  })
  async sendFaqMostCategories(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedCategories = plainToInstance(
      StatsMostAskedCategoriesDto,
      await this.statsService.getFaqMostAskedCategories(filters),
    );
    return result;
  }

  @Post('faq_kpi_data')
  @ApiOperation({ summary: 'Retourne les KPIs de la FAQ' })
  async sendFaqKPIData(@Body() filters: StatsFilterDto) {
    // TODO Deprecated
    return forkJoin({
      uniqueVisitorsNumber: this.statsService.getFaqNbUniqueVisitors(filters),
      avgQuestionPerVisitor:
        this.statsService.getFaqAvgQuestPerVisitors(filters),
    });
  }

  @Post('feedback_relevant_questions')
  @ApiOperation({
    summary: 'Retourne les connaissances ayant été flaguées comme pertinentes',
  })
  async sendFeedbackRelevantQuestions(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedQuestions = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackQuestions(
        filters,
        FeedbackStatus.relevant,
      ),
    );
    return result;
  }

  @Post('feedback_relevant_categories')
  @ApiOperation({
    summary:
      'Retourne les catégories liées aux connaissances ayant été flaguées comme pertinentes',
  })
  async sendFeedbackRelevantCategories(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedCategories = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackCategories(
        filters,
        FeedbackStatus.relevant,
      ),
    );
    return result;
  }

  @Post('feedback_wrong_questions')
  @ApiOperation({
    summary: 'Retourne les connaissances ayant été flaguées comme fausses',
  })
  async sendFeedbackWrongQuestions(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedQuestions = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackQuestions(
        filters,
        FeedbackStatus.wrong,
      ),
    );
    return result;
  }

  @Post('feedback_wrong_categories')
  @ApiOperation({
    summary:
      'Retourne les catégories liées aux connaissances ayant été flaguées comme fausses',
  })
  async sendFeedbackWrongCategories(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedCategories = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackCategories(
        filters,
        FeedbackStatus.wrong,
      ),
    );
    return result;
  }

  @Post('feedback_off_topic_questions')
  @ApiOperation({
    summary: 'Retourne les connaissances ayant été flaguées comme hors-sujet',
  })
  async sendFeedbackOfftopicQuestions(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedQuestions = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackQuestions(
        filters,
        FeedbackStatus.off_topic,
      ),
    );
    return result;
  }

  @Post('feedback_off_topic_categories')
  @ApiOperation({
    summary:
      'Retourne les catégories liées aux connaissances ayant été flaguées comme hors-sujet',
  })
  async sendFeedbackOfftopicCategories(@Body() filters: StatsFilterDto) {
    const result: any = {};
    result.mostAskedCategories = plainToInstance(
      StatsMostAskedQuestionsDto,
      await this.statsService.getFeedbackCategories(
        filters,
        FeedbackStatus.off_topic,
      ),
    );
    return result;
  }

  @Post('feedback_kpi_data')
  @ApiOperation({ summary: 'Retourne les KPIs pour les feedbacks' })
  async sendFeedbackKPIData(@Body() filters: StatsFilterDto) {
    // TODO Deprecated
    return forkJoin({
      relevantQuestions: this.statsService.getFeedbackKpi(
        filters,
        FeedbackStatus.relevant,
      ),
      relevantQuestionsPct: this.statsService.getFeedbackPctKpi(
        filters,
        FeedbackStatus.relevant,
      ),
      wrongQuestions: this.statsService.getFeedbackKpi(
        filters,
        FeedbackStatus.wrong,
      ),
      wrongQuestionsPct: this.statsService.getFeedbackPctKpi(
        filters,
        FeedbackStatus.wrong,
      ),
      offtopicQuestions: this.statsService.getFeedbackKpi(
        filters,
        FeedbackStatus.off_topic,
      ),
      offtopicQuestionsPct: this.statsService.getFeedbackPctKpi(
        filters,
        FeedbackStatus.off_topic,
      ),
    });
  }
}
