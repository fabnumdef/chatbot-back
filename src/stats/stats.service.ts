import { Injectable } from '@nestjs/common';
import { StatsMostAskedQuestionsDto } from '@core/dto/stats-most-asked-questions.dto';
import { StatsMostAskedCategoriesDto } from '@core/dto/stats-most-asked-categories.dto';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';
import { StatsFilterDto } from '../core/dto/stats-filter.dto';
import { IntentService } from '../intent/intent.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { InboxService } from '../inbox/inbox.service';
import { FeedbackService } from '../feedback/feedback.service';
import { FaqService } from '../faq/faq.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly _intentService: IntentService,
    private readonly _knowledgeService: KnowledgeService,
    private readonly _inboxService: InboxService,
    private readonly _feedbackService: FeedbackService,
    private readonly _faqService: FaqService,
  ) {}

  /**
   * Récupération du nombre de requêtes par jour
   * @param filters
   */
  getNbAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbInboxByTime(filters);
  }

  /**
   * Récupération du nombre de visiteurs par jour
   * @param filters
   */
  getNbVisitors(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbVisitorsByTime(filters);
  }

  /**
   * Récupération du nombre total de visiteurs
   * @param filters
   */
  getNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findNbUniqueVisitors(filters);
  }

  /**
   * Récupération du nombre total de visiteurs sur la FAQ
   * @param filters
   */
  getFaqNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    return this._faqService.findNbUniqueVisitors(filters);
  }

  /**
   * Récupération du nombre de connaissances créées par jour
   * @param filters
   */
  getNbIntent(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNbIntentByTime(filters);
  }

  /**
   * Récupération du nombre de feedbacks laissés par jour
   * @param filters
   */
  getNbFeedbacks(filters: StatsFilterDto): Promise<Array<string>> {
    return this._feedbackService.findNbFeedbackByTime(filters);
  }

  /**
   * Récupération des connaissances les plus demandées
   * @param filters
   */
  getMostAskedQuestions(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedQuestionsDto[]> {
    return this._inboxService.findMostAskedQuestions(filters);
  }

  /**
   * Récupération des connaissances les plus demandées via la FAQ
   * @param filters
   */
  getFaqMostAskedQuestions(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedQuestionsDto[]> {
    return this._faqService.findMostAskedQuestions(filters);
  }

  /**
   * Récupération des catégories liées aux connaissances les plus demandées
   * @param filters
   */
  getMostAskedCategories(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findMostAskedCategories(filters);
  }

  /**
   * Récupération des catégories liées aux connaissances les plus demandées via la FAQ
   * @param filters
   */
  getFaqMostAskedCategories(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    return this._faqService.findMostAskedCategories(filters);
  }

  /**
   * Récupération des connaissances jamais demandées
   * @param filters
   */
  getNeverAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNeverUsedIntent(filters);
  }

  /**
   * Récupération du nombre de questions moyennes par visiteur
   * @param filters
   */
  getAvgQuestPerVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgQuestPerVisitor(filters);
  }

  /**
   * Récupération du nombre d'intéractions moyennes par visiteur sur la FAQ
   * @param filters
   */
  getFaqAvgQuestPerVisitors(filters: StatsFilterDto): Promise<string> {
    return this._faqService.findAvgQuestPerVisitor(filters);
  }

  /**
   * Récupération du temps de réponse moyen de RASA
   * @param filters
   */
  getAvgResponseTime(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgResponseTime(filters);
  }

  /**
   * Récupération du pourcentage de réponses données par RASA
   * @param filters
   */
  getRatioResponseOk(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters);
  }

  /**
   * Récupération du pourcentage de réponses quasi-sûres (confiance à 95%) données par RASA
   * @param filters
   */
  getRatioResponseSure(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters, 0.95);
  }

  /**
   * Récupération des connaissances les plus demandées ayant été flaguées avec le feedbackStatus passé en argument
   * @param filters
   * @param feedbackStatus
   */
  getFeedbackQuestions(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ): Promise<StatsMostAskedQuestionsDto[]> {
    return this._inboxService.findMostAskedQuestions(filters, feedbackStatus);
  }

  /**
   * Récupération des catégories liées connaissances les plus demandées ayant été flaguées avec le feedbackStatus passé en argument
   * @param filters
   * @param feedbackStatus
   */
  getFeedbackCategories(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findMostAskedCategories(filters, feedbackStatus);
  }

  /**
   * Récupération du nombre de feedbacks laissés par les visiteurs
   * @param filters
   * @param feedbackStatus
   */
  getFeedbackKpi(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findCountFeedback(filters, feedbackStatus);
  }

  /**
   * Récupération du pourcentage de feedbacks par rapport au nombre total de requêtes
   * @param filters
   * @param feedbackStatus
   */
  getFeedbackPctKpi(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    return this._inboxService.findRatioFeedback(filters, feedbackStatus);
  }
}
