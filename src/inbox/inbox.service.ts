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
import { UserService } from "../user/user.service";

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

  findNbInboxByTime(): Promise<Array<string>> {
    
    const result =  this._inboxesRepository.createQueryBuilder('inbox')
    .select("DATE(inbox.created_at) AS date")
    .addSelect("COUNT(*) AS count")
    .groupBy("DATE(inbox.created_at)")
    .orderBy("DATE(inbox.created_at)", 'ASC')
    .getRawMany();
    return result;
 }

  findNbVisitorsByTime(): Promise<Array<string>> {
    
    const result =  this._inboxesRepository.createQueryBuilder('inbox')
    .select("DATE(inbox.created_at) AS date")
    .addSelect("COUNT(DISTINCT sender_id) AS count")
    .groupBy("DATE(inbox.created_at)")
    .orderBy("DATE(inbox.created_at)", 'ASC')
    .getRawMany();
    return result;
  }

  findNbUniqueVisitors(): Promise<string> {
    
    const result =  this._inboxesRepository.createQueryBuilder('inbox')
    .select("COUNT(DISTINCT sender_id) AS visitors")
    .getRawOne();
    return result;
  }

}
