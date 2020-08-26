import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import * as moment from 'moment';
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";

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
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      })
      .andWhere(!!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)
      .addOrderBy(`case intent.status 
          when 'to_deploy' then 1
          when 'in_training' then 2
          when 'active_modified' then 3
          when 'active' then 4
          when 'to_archive' then 5
          when 'archived' then 6
          end`)
      .addOrderBy('intent.updated_at', 'DESC')
      .addOrderBy('intent.main_question', 'ASC');

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

  getFullIntentQueryBuilder(id?: string) {
    return this._intentsRepository.createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'responses')
      .leftJoinAndSelect('intent.knowledges', 'knowledges')
      .where("intent.status IN (:...status)", {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      })
      .andWhere(id ? `intent.id = '${id}'` : `'1'`)
      .orderBy({
        'intent.id': 'ASC',
        'knowledges.id': 'ASC',
        'responses.id': 'ASC'
      })
  }

  async findAllCategories(active = false): Promise<string[]> {
    const query = this._intentsRepository.createQueryBuilder('intent')
      .select('DISTINCT category', 'category')
      .orderBy('category', 'ASC');

    if (active) {
      query.where("intent.status IN (:...status)", {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      });
    }

    const intents: Intent[] = await query.getRawMany();

    return intents.filter(i => !!i.category).map(i => i.category);
  }

  findOne(id: string): Promise<Intent> {
    return this.getFullIntentQueryBuilder(id).getOne();
  }

  findIntentsMatching(query: string, intentsNumber = 10): Promise<Intent[]> {
    return this.getIntentQueryBuilder(PaginationUtils.setQuery(<PaginationQueryDto> {query: query}, Intent.getAttributesToSearch()), null)
      .select(['id', 'main_question', 'category'])
      .orderBy('main_question', 'ASC', 'NULLS LAST')
      .take(intentsNumber)
      .getRawMany();
  }

  async intentExists(id: string): Promise<boolean> {
    return !!(await this.findOne(id));
  }

  async createEdit(intent: Intent, id?: string): Promise<Intent> {
    switch (intent.status) {
      case IntentStatus.active:
      case IntentStatus.in_training:
        intent.status = IntentStatus.active_modified;
        break;
    }
    const intentCreatedEdited = await this._intentsRepository.save(intent);
    if (id) {
      await this.delete(id);
      await this._responseService.updateIntentResponses(id, intent.id);
    }
    await this._updateNeedTraining();
    return intentCreatedEdited;
  }

  async delete(intentId): Promise<UpdateResult> {
    if (['phrase_presentation', 'phrase_hors_sujet'].includes(intentId)) {
      throw new HttpException('Impossible de supprimer les phrases de présentation et d\'hors sujet.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const intentDeleted = await this._intentsRepository.update({id: intentId}, {status: IntentStatus.to_archive});
    await this._updateNeedTraining();
    return intentDeleted;
  }

  async saveMany(intents: IntentModel[]): Promise<Intent[]> {
    const intentsCreated = await this._intentsRepository.save(intents);
    await this._updateNeedTraining();
    return intentsCreated;
  }

  async updateManyByCondition(condition: any, params: any): Promise<UpdateResult> {
    const intentsUpdated = await this._intentsRepository.update(condition, params);
    await this._updateNeedTraining();
    return intentsUpdated;
  }

  getRepository(): Repository<Intent> {
    return this._intentsRepository;
  }

  findNbIntentByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : (moment().subtract(1, 'month').format('YYYY-MM-DD'));
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    const query = this._intentsRepository.createQueryBuilder('intent')
      .select("DATE(intent.created_at) AS date")
      .addSelect("COUNT(*) AS count")
      .where(`DATE(intent.created_at) >= '${startDate}'`)
      .andWhere(`DATE(intent.created_at) <= '${endDate}'`)
      .groupBy("DATE(intent.created_at)")
      .orderBy("DATE(intent.created_at)", 'ASC');
    return query.getRawMany();
  }

  findNeverUsedIntent(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate ? (moment(filters.startDate).format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate).format('YYYY-MM-DD') : null;


    const query = this._intentsRepository
      .createQueryBuilder('intent')
      .select("intent.main_question as question")
      .leftJoin(subq => {
        subq.from('intent', 'intent')
          .select("intent.id AS intentid")
          .innerJoin("inbox", "inbox", "inbox.intent = intent.id");
        if (startDate) {
          subq.where(`DATE(inbox.created_at) >= '${startDate}'`)
        }
        if (endDate) {
          subq.andWhere(`DATE(inbox.created_at) <= '${endDate}'`)
        }
        return subq
      }, 't1', 't1.intentid = intent.id')
      .groupBy("intent.main_question")
      .having("COUNT(t1.intentid) = 0")
      .orderBy("intent.main_question", 'ASC');

    return query.getRawMany();
  }

  private async _updateNeedTraining() {
    const needTraining = await this._intentsRepository.count({status: In([IntentStatus.to_deploy, IntentStatus.active_modified, IntentStatus.to_archive])});
    await this._configService.update(<ChatbotConfig>{need_training: (needTraining > 0)});
  }
}
