import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FaqEvents } from "@core/entities/faq-events.entity";
import { StatsFilterDto } from "@core/dto/stats-filter.dto";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";
import * as moment from "moment";
import { AppConstants } from "@core/constant";
import { StatsMostAskedCategoriesDto } from "@core/dto/stats-most-asked-categories.dto";

@Injectable()
export class FaqService {
  constructor(@InjectRepository(FaqEvents)
              private readonly _faqEventsRepository: Repository<FaqEvents>) {
  }

  connectToFaq(senderId: string) {
    return this._createFaqEvent(senderId, 'connection');
  }

  searchCategory(senderId: string, category: string) {
    return this._createFaqEvent(senderId, 'category', category);
  }

  clickIntent(senderId: string, intentId: string) {
    return this._createFaqEvent(senderId, 'intent', null, intentId);
  }

  findMostAskedQuestions(filters: StatsFilterDto): Promise<StatsMostAskedQuestionsDto[]> {
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;

    const query = this._faqEventsRepository.createQueryBuilder('faq_events')
      .select('int.main_question AS question')
      .addSelect("COUNT(faq_events.intent_name) AS count")
      .innerJoin("intent", "int", 'int.id = faq_events.intent_name')
      // Remove phrase_presentation & co
      .where('int.id NOT IN (:...excludedIds)', {excludedIds: AppConstants.General.excluded_Ids})
      // Remove small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`)
    if (startDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) <= '${endDate}'`)
    }
    query.groupBy('int.main_question')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  findMostAskedCategories(filters: StatsFilterDto): Promise<StatsMostAskedCategoriesDto[]> {
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;

    const query = this._faqEventsRepository.createQueryBuilder('faq_events')
      .select('int.category AS category')
      .addSelect("COUNT(faq_events.intent_name) AS count")
      .innerJoin("intent", "int", 'int.id = faq_events.intent_name')
      // Remove phrase_presentation & co
      .where('int.id NOT IN (:...excludedIds)', {excludedIds: AppConstants.General.excluded_Ids})
      // Remove small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`)
    if (startDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) <= '${endDate}'`)
    }
    query.groupBy('int.category')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  findNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;

    const query = this._faqEventsRepository.createQueryBuilder('faq_events')
      .select("COUNT(DISTINCT sender_id) AS visitors");
    if (startDate) {
      query.where(`DATE(to_timestamp(faq_events.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) <= '${endDate}'`)
    }

    return query.getRawOne();
  }

  findAvgQuestPerVisitor(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;

    const query = this._faqEventsRepository
      .createQueryBuilder('faq_events')
      .select("ROUND(count(*) * 1.0 / count(distinct faq_events.sender_id), 2) as averageQuestions")
    if (startDate) {
      query.where(`DATE(to_timestamp(faq_events.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(faq_events.timestamp)) <= '${endDate}'`)
    }

    return query.getRawOne();
  }

  private async _createFaqEvent(senderId: string, type: string, category?: string, intent?: string) {
    if (!senderId) {
      return;
    }
    const toCreate = <FaqEvents>{
      sender_id: senderId,
      type_name: type,
      category_name: category ? category : null,
      intent_name: intent ? intent : null
    };
    return await this._faqEventsRepository.save(toCreate);
  }
}
