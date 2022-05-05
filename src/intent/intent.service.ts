import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, In, Repository } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ResponseService } from "../response/response.service";
import { PaginationUtils } from "@core/pagination-utils";
import { IntentFilterDto } from "@core/dto/intent-filter.dto";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import * as moment from 'moment';
import { AppConstants } from "@core/constant";
import { Response } from "@core/entities/response.entity";
import { ResponseType } from "@core/enums/response-type.enum";
import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";

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

  findFullIntents(options: PaginationQueryDto = null,
                  filters: IntentFilterDto = null,
                  getHidden = true,
                  getResponses = true,
                  getKnowledges = true): Promise<Intent[]> {
    return this.getFullIntentQueryBuilder(PaginationUtils.setQuery(options, Intent.getAttributesToSearch(), 'intent'),
      filters,
      null,
      getHidden,
      getResponses,
      getKnowledges).getMany();
  }

  findByCategory(category: string): Promise<Intent[]> {
    return this.getIntentAndResponseQueryBuilder()
      .andWhere(`category = '${category}'`)
      .andWhere("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {excludedIds: AppConstants.General.excluded_Ids})
      .getMany();
  }

  async paginate(options: PaginationQueryDto, filters: IntentFilterDto): Promise<Pagination<IntentModel>> {
    const results = await paginate(
      this.getIntentQueryBuilder(PaginationUtils.setQuery(options, Intent.getAttributesToSearch(), 'intent'), filters),
      options
    );

    // Obligé de faire ça pour la pagination quand il y a des left join
    return new Pagination(
      // @ts-ignore
      await Promise.all(results.items.map(async (item: IntentModel) => {
        const [knowledges, responses, previousIntents, nextIntents] = await Promise.all([
          this._knowledgeService.findByIntent(item),
          this._responseService.findByIntent(item),
          this._findPreviousIntents(item),
          this._findNextIntents(item)
        ])
        // @ts-ignore
        item.knowledges = knowledges;
        // @ts-ignore
        item.responses = responses;
        // @ts-ignore
        item.previousIntents = previousIntents;
        // @ts-ignore
        item.nextIntents = nextIntents;

        return item;
      })),
      results.meta,
      results.links,
    );
  }

  getIntentQueryBuilder(findManyOptions: FindManyOptions, filters?: IntentFilterDto, getResponses?: boolean): SelectQueryBuilder<any> {
    let query = this._intentsRepository.createQueryBuilder('intent')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      })
      .andWhere(!!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)

    if (!getResponses) {
      query.addOrderBy(`case intent.status 
          when 'to_deploy' then 1
          when 'in_training' then 2
          when 'active_modified' then 3
          when 'active' then 4
          when 'to_archive' then 5
          when 'archived' then 6
          end`)
        .addOrderBy(`case when intent.expires_at::date >= now() - interval '1 month' then intent.expires_at end`)
        .addOrderBy('intent.updated_at', 'DESC')
        .addOrderBy('intent.main_question', 'ASC', 'NULLS LAST');
    }

    query = this._addFilters(query, filters);
    return query;
  }

  getFullIntentQueryBuilder(findManyOptions: FindManyOptions,
                            filters: IntentFilterDto,
                            id?: string,
                            getHidden?: boolean,
                            getResponses = true,
                            getKnowledges = true): SelectQueryBuilder<any> {
    let query = this._intentsRepository.createQueryBuilder('intent')
      .where("intent.status IN (:...status)", {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      })
      .andWhere(findManyOptions && !!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)
      .andWhere(id ? `intent.id = '${id}'` : `'1'`)
      .andWhere(getHidden ? `'1'` : `hidden = false`)
      .orderBy({
        'intent.id': 'ASC',
      })

    query = this._addFilters(query, filters);

    if (getKnowledges) {
      query.leftJoinAndSelect('intent.knowledges', 'knowledges')
      query.addOrderBy('knowledges.id', 'ASC')
    }
    if (getResponses) {
      query.leftJoinAndSelect('intent.responses', 'responses')
      query.addOrderBy('responses.id', 'ASC')
    }

    return query;
  }

  getIntentAndResponseQueryBuilder() {
    return this._intentsRepository.createQueryBuilder('intent')
      .select('intent.main_question')
      .addSelect('intent.id')
      .addSelect('intent.category')
      .leftJoinAndSelect('intent.responses', 'responses')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training
        ]
      })
      .andWhere(`hidden = false`)
      .orderBy({
        'intent.main_question': 'ASC',
        'responses.id': 'ASC'
      })
  }

  async findAllCategories(active = false): Promise<string[]> {
    const query = this._intentsRepository.createQueryBuilder('intent')
      .select('DISTINCT category', 'category')
      .where("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {excludedIds: AppConstants.General.excluded_Ids})
      .orderBy('category', 'ASC');

    if (active) {
      query.andWhere("intent.status IN (:...status)", {
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

  async findOne(id: string): Promise<Intent> {
    const intent = await this.getFullIntentQueryBuilder(null, null, id, true).getOne();
    if (!intent) {
      return;
    }
    const [previousIntents, nextIntents] = await Promise.all([
      // @ts-ignore
      this._findPreviousIntents(intent),
      // @ts-ignore
      this._findNextIntents(intent)
    ])
    // @ts-ignore
    intent.previousIntents = previousIntents;
    // @ts-ignore
    intent.nextIntents = nextIntents;

    return intent;
  }

  findIntentsMatching(query: string, intentsNumber = 1000, getResponses = false, excludeSt = false): Promise<Intent[]> {
    const queryBuilder = this.getIntentQueryBuilder(PaginationUtils.setQuery(<PaginationQueryDto>{query: query}, Intent.getAttributesToSearch(), 'intent'), null, getResponses)
      .andWhere('hidden = False')
      .andWhere("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {excludedIds: AppConstants.General.excluded_Ids})
      .select('intent.id')
      .addSelect('intent.main_question')
      .addSelect('intent.category')

    if (getResponses) {
      return queryBuilder.leftJoinAndSelect('intent.responses', 'responses')
        .orderBy({
          'intent.main_question': 'ASC',
          'responses.id': 'ASC'
        })
        .getMany();
    }
    return queryBuilder.take(intentsNumber)
      .getMany();
  }

  findIntentsMainQuestions(intentsId: string[]): Promise<Intent[]> {
    return this._intentsRepository.find({
      select: ['id', 'main_question'],
      where: {id: In(intentsId)}
    });
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
    if (AppConstants.General.excluded_Ids.includes(intentId)) {
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
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : (moment().subtract(1, 'month').format('YYYY-MM-DD'));
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
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
    const startDate = filters.startDate ? (moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')) : null;
    const endDate = filters.endDate ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;


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
      .where("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .groupBy("intent.main_question")
      .having("COUNT(t1.intentid) = 0")
      .orderBy("intent.main_question", 'ASC');

    return query.getRawMany();
  }

  public async getFullTree(options: PaginationQueryDto, filters: IntentFilterDto): Promise<Intent[]> {
    const intents: Intent[] = await this.findFullIntents(options, filters, true, true, false);
    const allIntents: Intent[] = await this.findFullIntents(null, null, true, true, false);
    return this._buildIntentsTree(intents, allIntents);
  }

  private _findPreviousIntents(intent: IntentModel): Promise<Intent[]> {
    const sql = this._intentsRepository.createQueryBuilder('intent')
      .select(['intent.id as id', 'main_question', 'category',
        '(select count(*) from response where intent.id = response."intentId" and type = \'quick_reply\') as linked_responses'])
      .leftJoin('intent.responses', 'responses')
      .where(`responses.response like '%<${intent.id}>%'`);

    return sql.getRawMany();
  }

  private async _findNextIntents(intent: IntentModel): Promise<Intent[]> {
    let intentsId = (await this._responseService.findByIntent(intent)).map((r: Response) => {
      if (![ResponseType.quick_reply, ResponseType.button].includes(r.response_type) || !r.response) {
        return null;
      }
      return r.response.split(';').map(text => {
        return text.substring(text.indexOf('<') + 1, text.indexOf('>')).trim();
      })
    }).filter(r => !!r);
    intentsId = [].concat(...intentsId);
    if (intentsId.length < 1) {
      return;
    }
    const sql = this._intentsRepository.createQueryBuilder('intent')
      .select(['intent.id as id', 'main_question', 'category',
        '(select count(*) from response where intent.id = response."intentId" and type = \'quick_reply\') as linked_responses'])
      .where("intent.id IN (:...ids)", {
        ids: intentsId
      });

    return sql.getRawMany();
  }

  private async _updateNeedTraining() {
    const needTraining = await this._intentsRepository.count({status: In([IntentStatus.to_deploy, IntentStatus.active_modified, IntentStatus.to_archive])});
    await this._configService.update(<ChatbotConfig>{need_training: (needTraining > 0)});
  }

  private _buildIntentsTree(intents: Intent[], allIntents: Intent[]): Intent[] {
    const rootIntents: Intent[] = [];
    intents.forEach(intent => {
      if (!allIntents.find(i => i.responses.find(r => r.response.includes(intent.id)))) {
        // @ts-ignore
        intent.previousIntents = null;
        rootIntents.push(intent);
      }
    });
    this._buildIntentBranch(rootIntents, allIntents);
    return rootIntents;
  }

  private _buildIntentBranch(rootIntents: Intent[], fullIntents: Intent[]) {
    rootIntents.forEach(rootIntent => {
      let intentsId = rootIntent.responses.map((r: Response) => {
        if (![ResponseType.quick_reply, ResponseType.button].includes(r.response_type) || !r.response) {
          return null;
        }
        return r.response.split(';').map(text => {
          return text.substring(text.indexOf('<') + 1, text.indexOf('>')).trim();
        })
      });
      intentsId = [].concat(...intentsId);
      intentsId = intentsId.filter(id => {
        // @ts-ignore
        return !!id && (!rootIntent.parents || !rootIntent.parents.includes(id));
      });
      if (intentsId.length < 1) {
        // @ts-ignore
        rootIntent.nextIntents = [];
        return;
      }
      // @ts-ignore
      rootIntent.nextIntents = fullIntents.filter(intent => intentsId.includes(intent.id));
      return;
    });

    // @ts-ignore
    let nextRootIntents = rootIntents.map(r => {
      // @ts-ignore
      r.nextIntents = r.nextIntents.map(n => {
        // @ts-ignore
        n.parents = r.parents ? r.parents : [];
        n.parents.push(r.id);
        return n;
      })
      // @ts-ignore
      return r.nextIntents;
      // @ts-ignore
    });
    nextRootIntents = [].concat(...nextRootIntents);
    if (!nextRootIntents || nextRootIntents.length < 1) {
      return;
    }
    this._buildIntentBranch(nextRootIntents, fullIntents);
  }

  private _addFilters(query: SelectQueryBuilder<any>, filters: IntentFilterDto): SelectQueryBuilder<any> {
    if (!filters) {
      return query;
    }
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('intent.category IN (:...categories)', {categories: filters.categories});
    }
    if (filters.hidden) {
      query.andWhere('intent.hidden = true');
    }
    if (filters.expiresAt) {
      query.andWhere(`intent.expires_at::date >= date '${filters.expiresAt}'`);
    } else if (filters.expires) {
      query.andWhere('intent.expires_at is not null');
    }
    if (filters.intentInError) {
      query.andWhere('(SELECT count(*) FROM "knowledge" WHERE "knowledge"."intentId" = "intent"."id") < 2');
    }
    if (filters.users && filters.users.length > 0) {
      query.andWhere('intent.userEmail IN (:...users)', {users: filters.users});
    }

    return query;
  }
}
