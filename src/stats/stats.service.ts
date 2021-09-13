import { StatsFilterDto } from './../core/dto/stats-filter.dto';
import { Injectable } from '@nestjs/common';
import { IntentService } from "../intent/intent.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { InboxService } from "../inbox/inbox.service";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";
import { FeedbackService } from "../feedback/feedback.service";
import { StatsMostAskedCategoriesDto } from "@core/dto/stats-most-asked-categories.dto";
import { FaqService } from "../faq/faq.service";
import { FeedbackStatus } from "@core/enums/feedback-status.enum";

@Injectable()
export class StatsService {

  constructor(private readonly _intentService: IntentService,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _inboxService: InboxService,
              private readonly _feedbackService: FeedbackService,
              private readonly _faqService: FaqService) {

  }

  getNbAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbInboxByTime(filters);
  }

  getNbVisitors(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbVisitorsByTime(filters);
  }

  getNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findNbUniqueVisitors(filters);
  }

  getFaqNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    return this._faqService.findNbUniqueVisitors(filters);
  }

  getNbIntent(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNbIntentByTime(filters);
  }

  getNbFeedbacks(filters: StatsFilterDto): Promise<Array<string>> {
    return this._feedbackService.findNbFeedbackByTime(filters);
  }

  getMostAskedQuestions(filters: StatsFilterDto): Promise<StatsMostAskedQuestionsDto[]> {
    return this._inboxService.findMostAskedQuestions(filters);
  }

  getFaqMostAskedQuestions(filters: StatsFilterDto): Promise<StatsMostAskedQuestionsDto[]> {
    return this._faqService.findMostAskedQuestions(filters);
  }

  getMostAskedCategories(filters: StatsFilterDto): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findMostAskedCategories(filters);
  }

  getFaqMostAskedCategories(filters: StatsFilterDto): Promise<StatsMostAskedCategoriesDto[]> {
    return this._faqService.findMostAskedCategories(filters);
  }

  getNeverAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNeverUsedIntent(filters);
  }

  getAvgQuestPerVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgQuestPerVisitor(filters);
  }

  getFaqAvgQuestPerVisitors(filters: StatsFilterDto): Promise<string> {
    return this._faqService.findAvgQuestPerVisitor(filters);
  }

  getAvgResponseTime(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgResponseTime(filters);
  }

  getRatioResponseOk(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters);
  }

  getRatioResponseSure(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters, 0.95);
  }

  getFeedbackQuestions(filters: StatsFilterDto, feedbackStatus: FeedbackStatus): Promise<StatsMostAskedQuestionsDto[]> {
    return this._inboxService.findMostAskedQuestions(filters, feedbackStatus);
  }

  getFeedbackCategories(filters: StatsFilterDto, feedbackStatus: FeedbackStatus): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findMostAskedCategories(filters, feedbackStatus);
  }

  getFeedbackKpi(filters: StatsFilterDto, feedbackStatus: FeedbackStatus): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findCountFeedback(filters, feedbackStatus);
  }

  getFeedbackPctKpi(filters: StatsFilterDto, feedbackStatus: FeedbackStatus): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findRatioFeedback(filters, feedbackStatus);
  }

}
