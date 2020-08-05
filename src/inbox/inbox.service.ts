import { StatsFilterDto } from './../core/dto/stats-filter.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, Repository } from "typeorm";
import { Inbox } from "@core/entities/inbox.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { PaginationUtils } from "@core/pagination-utils";
import { InboxFilterDto } from "@core/dto/inbox-filter.dto";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { Knowledge } from "@core/entities/knowledge.entity";
import { IntentService } from "../intent/intent.service";
import { IntentStatus } from "@core/enums/intent-status.enum";
import * as moment from 'moment';
import { UserService } from "../user/user.service";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";
import { Feedback } from "@core/entities/feedback.entity";
import * as escape from "pg-escape";
import { Between } from "typeorm/index";

@Injectable()
export class InboxService {

  constructor(@InjectRepository(Inbox)
              private readonly _inboxesRepository: Repository<Inbox>,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _intentService: IntentService,
              private readonly _userService: UserService) {
  }

  findAll(params = {
    where: {
      status: InboxStatus.pending
    }
  }): Promise<Inbox[]> {
    return this._inboxesRepository.find(params);
  }

  findOne(inboxId) {
    return this._inboxesRepository.findOne(inboxId, {relations: ['intent']});
  }

  save(inbox: Inbox): Promise<Inbox> {
    return this._inboxesRepository.save(inbox);
  }

  async paginate(options: PaginationQueryDto, filters: InboxFilterDto): Promise<Pagination<Inbox>> {
    return paginate<Inbox>(
      this.getInboxQueryBuilder(PaginationUtils.setQuery(options, Inbox.getAttributesToSearch()), filters),
      options
    );
  }

  getInboxQueryBuilder(findManyOptions: FindManyOptions, filters?: InboxFilterDto) {
    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .leftJoinAndSelect('inbox.intent', 'intent')
      .leftJoin('inbox.user', 'user')
      .addSelect(['user.email', 'user.first_name', 'user.last_name', 'user.role'])
      .andWhere(!!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)
      .orderBy({
        'inbox.timestamp': 'DESC'
      })

    if (!filters) {
      return query;
    }
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('intent.category IN (:...categories)', {categories: filters.categories});
    }
    if (filters.statutes && filters.statutes.length > 0) {
      query.andWhere('inbox.status IN (:...statutes)', {statutes: filters.statutes});
    }
    if (filters.startDate) {
      query.andWhere(`to_timestamp(inbox.timestamp)::date >= date '${filters.startDate}'`);
    }
    if (filters.endDate) {
      query.andWhere(`to_timestamp(inbox.timestamp)::date <= date '${filters.endDate}'`);
    }
    if (filters.assignedTo) {
      query.andWhere(`inbox.user.email = '${filters.assignedTo}'`);
    }

    return query;
  }

  async validate(inboxId): Promise<UpdateResult> {
    const inbox = await this.findOne(inboxId);
    const newKnowledge: Knowledge = {
      id: null,
      intent: inbox.intent,
      question: inbox.question
    }
    await this._knowledgeService.createSafe(newKnowledge);
    if (inbox.intent.status === IntentStatus.active) {
      await this._intentService.updateManyByCondition({id: inbox.intent.id}, {status: IntentStatus.active_modified});
    }
    return this._inboxesRepository.update({id: inboxId}, {status: InboxStatus.confirmed});
  }

  async assign(inboxId, userEmail): Promise<UpdateResult> {
    const user = await this._userService.findOne(userEmail);
    return this._inboxesRepository.update({id: inboxId}, {user: user});
  }

  delete(inboxId): Promise<UpdateResult> {
    return this._inboxesRepository.update({id: inboxId}, {status: InboxStatus.archived});
  }

  findNbInboxByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : (moment().subtract(1, 'month').format('YYYY-MM-DD'));
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select("DATE(to_timestamp(inbox.timestamp)) AS date")
      .addSelect("COUNT(*) AS count")
      .where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
      .andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
      .groupBy("DATE(to_timestamp(inbox.timestamp))")
      .orderBy("DATE(to_timestamp(inbox.timestamp))", 'ASC');
    return query.getRawMany();
  }

  findNbVisitorsByTime(filters: StatsFilterDto): Promise<Array<string>> {

    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : (moment().subtract(1, 'month').format('YYYY-MM-DD'));
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');

    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select("DATE(to_timestamp(inbox.timestamp)) AS date")
      .addSelect("COUNT(DISTINCT sender_id) AS count")
      .where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
      .andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
      .groupBy("DATE(to_timestamp(inbox.timestamp))")
      .orderBy("DATE(to_timestamp(inbox.timestamp))", 'ASC');
    return query.getRawMany();
  }

  findNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;

    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select("COUNT(DISTINCT sender_id) AS visitors");
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
    }
    return query.getRawOne();
  }

  findMostAskedQuestions(filters: StatsFilterDto): Promise<StatsMostAskedQuestionsDto[]> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;

    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select('int.main_question AS question')
      .addSelect("COUNT(inbox.intent) AS count")
      .innerJoin("intent", "int", 'int.id = inbox.intent')
      .where(`int.id NOT IN ('phrase_presentation', 'phrase_hors_sujet')`)
    if (startDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
    }
    query.groupBy('int.main_question')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(7);
    return query.getRawMany();
  }

  findAvgQuestPerVisitor(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;

    const subquery = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select("inbox.sender_id")
      .addSelect("DATE(to_timestamp(inbox.timestamp))")
      .addSelect("count(*) as count")
    if (startDate) {
      subquery.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      subquery.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
    }
    subquery.groupBy("(DATE(to_timestamp(inbox.timestamp))), inbox.sender_id");

    const query = this._inboxesRepository
      .createQueryBuilder()
      .select("ROUND(AVG(count), 2) as averageQuestions")
      .from("(" + subquery.getQuery() + ")", "t1")
      .setParameters(subquery.getParameters());

    return query.getRawOne();
  }

  findAvgResponseTime(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate ? moment(filters.startDate).format('YYYY-MM-DD') : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;

    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select('ROUND(avg(inbox.response_time), 0) as averageResponse');
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
    }

    return query.getRawOne();
  }

  async findRatioResponseOk(filters: StatsFilterDto, confidence = 0.6): Promise<string> {
    const startDate = filters.startDate ? moment(filters.startDate).format('YYYY-MM-DD') : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;

    const query = this._inboxesRepository.createQueryBuilder('inbox')
      .select(`100 * (SELECT COUNT(inbox.id) from inbox WHERE inbox.confidence >= ${confidence.toString(10)})/COUNT(inbox.id) as ratioResponseOk`);
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
    }

    return query.getRawOne();
  }

  /**
   * Update inbox status with feedback
   * @param feedback
   * Return true if inbox has been found / updated or false if it has not been found
   */
  public async updateInboxWithFeedback(feedback: Feedback): Promise<boolean> {
    const tenMinutes = 10*60;
    // We search the right inbox +- 10 minutes
    const inbox: Inbox = await this._inboxesRepository.createQueryBuilder('inbox')
      .where({
        timestamp: Between(feedback.timestamp - tenMinutes, feedback.timestamp + tenMinutes),
        sender_id: feedback.sender_id
      })
      .andWhere(escape(`unaccent(upper(question)) like unaccent(${feedback.user_question.toUpperCase()})`))
      .getOne();

    if(!inbox) {
      return false;
    }

    // @ts-ignore
    this._inboxesRepository.update(inbox.id, {status: feedback.status});
    return true;
  }

}
