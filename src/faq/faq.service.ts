import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqEvents } from '@core/entities/faq-events.entity';
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import { StatsMostAskedQuestionsDto } from '@core/dto/stats-most-asked-questions.dto';
import * as moment from 'moment';
import { AppConstants } from '@core/constant';
import { StatsMostAskedCategoriesDto } from '@core/dto/stats-most-asked-categories.dto';

@Injectable()
export default class FaqService {
  constructor(
    @InjectRepository(FaqEvents)
    private readonly faqEventsRepository: Repository<FaqEvents>,
  ) {}

  /**
   * Ajout d'un événement connection
   * @param senderId
   */
  connectToFaq(senderId: string) {
    return this.createFaqEvent(senderId, 'connection');
  }

  /**
   * Ajout d'un événement catégorie avec la catégorie correspondante
   * @param senderId
   * @param category
   */
  searchCategory(senderId: string, category: string) {
    return this.createFaqEvent(senderId, 'category', category);
  }

  /**
   * Ajout d'un événement intent avec l'id correspondant
   * @param senderId
   * @param intentId
   */
  clickIntent(senderId: string, intentId: string) {
    return this.createFaqEvent(senderId, 'intent', null, intentId);
  }

  /**
   * Récupération des questions les plus cherchées via la FAQ
   * Possibilité de filtrer par dates
   * @param filters
   */
  findMostAskedQuestions(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedQuestionsDto[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this.faqEventsRepository
      .createQueryBuilder('faq_events')
      .select('int.main_question AS question')
      .addSelect('COUNT(faq_events.intent_name) AS count')
      .innerJoin('intent', 'int', 'int.id = faq_events.intent_name')
      // On exclut les phrases génériques
      .where('int.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      // On exclut les small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`);
    if (startDate) {
      query.andWhere(`DATE(faq_events.timestamp) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(faq_events.timestamp) <= '${endDate}'`);
    }
    query
      .groupBy('int.main_question')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  /**
   * Récupération des catégories les plus cherchées via la FAQ
   * Possibilité de filtrer par dates
   * @param filters
   */
  findMostAskedCategories(
    filters: StatsFilterDto,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this.faqEventsRepository
      .createQueryBuilder('faq_events')
      .select('int.category AS category')
      .addSelect('COUNT(faq_events.intent_name) AS count')
      .innerJoin('intent', 'int', 'int.id = faq_events.intent_name')
      // On exclut les phrases génériques
      .where('int.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      // On exclut les small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`);
    if (startDate) {
      query.andWhere(`DATE(faq_events.timestamp) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(faq_events.timestamp) <= '${endDate}'`);
    }
    query
      .groupBy('int.category')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  /**
   * Récupération du nombre de visiteurs uniques sur la FAQ
   * Possibilité de filtrer par dates
   * @param filters
   */
  findNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this.faqEventsRepository
      .createQueryBuilder('faq_events')
      .select('COUNT(DISTINCT sender_id) AS visitors');
    if (startDate) {
      query.where(`DATE(faq_events.timestamp) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(faq_events.timestamp) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération du nombre moyen d'intéractions avec la FAQ par visiteur
   * Possibilité de filtrer par dates
   * @param filters
   */
  findAvgQuestPerVisitor(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this.faqEventsRepository
      .createQueryBuilder('faq_events')
      .select(
        'COALESCE(ROUND(count(*) * 1.0 / NULLIF(count(distinct faq_events.sender_id),0), 2), 0) as averageQuestions',
      );
    if (startDate) {
      query.where(`DATE(faq_events.timestamp) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(faq_events.timestamp) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Création d'une ligne correspondante à une intéraction avec la FAQ
   * @param senderId
   * @param type
   * @param category
   * @param intent
   * @private
   */
  private async createFaqEvent(
    senderId: string,
    type: string,
    category?: string,
    intent?: string,
  ) {
    if (!senderId) {
      return;
    }
    const toCreate = <FaqEvents>{
      sender_id: senderId,
      type_name: type,
      category_name: category || null,
      intent_name: intent || null,
    };
    return this.faqEventsRepository.save(toCreate);
  }
}
