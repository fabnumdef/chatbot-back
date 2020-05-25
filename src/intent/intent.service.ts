import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, In, Repository } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ResponseService } from "../response/response.service";
import { PaginationUtils } from "@core/pagination-utils";
import { IntentFilterDto } from "@core/dto/intent-filter.dto";
import { MediaModel } from "@core/models/media.model";
import { Inbox } from "@core/entities/inbox.entity";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

@Injectable()
export class IntentService {

  constructor(@InjectRepository(Intent)
              private readonly _intentsRepository: Repository<Intent>,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _responseService: ResponseService,
              private readonly _configService: ChatbotConfigService) {
  }

  findAll(params: any = {status: IntentStatus.active}): Promise<Intent[]> {
    return this._intentsRepository.find(params);
  }

  findFullIntents(): Promise<Intent[]> {
    return this.getFullIntentQueryBuilder().getMany();
  }

  async paginate(options: PaginationQueryDto, filters: IntentFilterDto): Promise<Pagination<Intent>> {
    const results = await paginate(
      this.getIntentQueryBuilder(PaginationUtils.setQuery(options, Intent.getAttributesToSearch()), filters),
      options
    );

    // Obligé de faire ça pour la pagination quand il y a des left join
    return new Pagination(
      await Promise.all(results.items.map(async (item: Intent) => {
        const knowledges = await this._knowledgeService.findByIntent(item);
        const responses = await this._responseService.findByIntent(item);
        item.knowledges = knowledges;
        item.responses = responses;

        return item;
      })),
      results.meta,
      results.links,
    );
  }

  getIntentQueryBuilder(findManyOptions: FindManyOptions, filters?: IntentFilterDto) {
    const query = this._intentsRepository.createQueryBuilder('intent')
      .where('intent.status IN (:...status)', {status: [IntentStatus.to_deploy, IntentStatus.active, IntentStatus.active_modified]})
      .andWhere(!!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)
      .orderBy({
        'intent.id': 'ASC'
      })

    if (!filters) {
      return query;
    }
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('intent.category IN (:...categories)', {categories: filters.categories});
    }
    if (filters.expiresAt) {
      query.andWhere(`intent.expires_at::date >= date '${filters.expiresAt}'`);
    } else if (filters.expires) {
      query.andWhere('intent.expires_at is not null');
    }

    return query;
  }

  getFullIntentQueryBuilder() {
    return this._intentsRepository.createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'responses')
      .leftJoinAndSelect('intent.knowledges', 'knowledges')
      .where("intent.status IN (:...status)", {status: [IntentStatus.to_deploy, IntentStatus.active, IntentStatus.active_modified]})
      .orderBy({
        'intent.id': 'ASC',
        'knowledges.id': 'ASC',
        'responses.id': 'ASC'
      })
  }

  async findAllCategories(): Promise<string[]> {
    const intents: Intent[] = await this._intentsRepository.createQueryBuilder('intent')
      .select('DISTINCT category', 'category')
      .orderBy('category', 'ASC')
      .getRawMany();

    return intents.filter(i => !!i.category).map(i => i.category);
  }

  findOne(id: string): Promise<Intent> {
    return this._intentsRepository.findOne(id);
  }

  async create(intent: Intent): Promise<Intent> {
    switch (intent.status) {
      case IntentStatus.active:
        intent.status = IntentStatus.active_modified;
        break;
    }
    const intentCreated = await this._intentsRepository.save(intent);
    this._updateNeedTraining();
    return intentCreated;
  }

  async delete(intentId): Promise<UpdateResult> {
    const intentDeleted = await this._intentsRepository.update({id: intentId}, {status: IntentStatus.to_archive});
    this._updateNeedTraining();
    return intentDeleted;
  }

  async saveMany(intents: IntentModel[]): Promise<Intent[]> {
    const intentsCreated = await this._intentsRepository.save(intents);
    this._updateNeedTraining();
    return intentsCreated;
  }

  async updateManyByCondition(condition: any, params: any): Promise<UpdateResult> {
    const intentsUpdated = await this._intentsRepository.update(condition, params);
    this._updateNeedTraining();
    return intentsUpdated;
  }

  getRepository(): Repository<Intent> {
    return this._intentsRepository;
  }

  private async _updateNeedTraining() {
    const needTraining = await this._intentsRepository.count({status: In([IntentStatus.to_deploy, IntentStatus.active_modified, IntentStatus.to_archive])});
    this._configService.update(<ChatbotConfig>{need_training: (needTraining > 0)});
  }
}
