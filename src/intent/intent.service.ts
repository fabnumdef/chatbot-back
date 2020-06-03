import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, Like, Repository } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { Pagination, paginate } from "nestjs-typeorm-paginate/index";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ResponseService } from "../response/response.service";
import { PaginationUtils } from "@core/pagination-utils";
import { IntentFilterDto } from "@core/dto/intent-filter.dto";
import { MediaModel } from "@core/models/media.model";
import { Inbox } from "@core/entities/inbox.entity";

@Injectable()
export class IntentService {

  constructor(@InjectRepository(Intent)
              private readonly _intentsRepository: Repository<Intent>,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _responseService: ResponseService) {
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
      .where('intent.status IN (:...status)', {status: [IntentStatus.draft, IntentStatus.to_deploy, IntentStatus.active]})
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
      .where("intent.status IN (:...status)", {status: [IntentStatus.draft, IntentStatus.to_deploy, IntentStatus.active, IntentStatus.archived]})
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

  findByMedia(media: MediaModel): Promise<Intent[]> {
    return this._intentsRepository.find({
      select: ['id', 'main_question', 'category'],
      join: { alias: 'intents', innerJoin: { responses: 'intents.responses' } },
      where: qb => {
        qb.where(`responses.response like '%/${media.file}%'`)
      },
    });
  }

  findByInbox(inbox: Inbox): Promise<Intent> {
    return this._intentsRepository.findOne({
      select: ['id', 'main_question', 'category'],
      join: { alias: 'intents', innerJoin: { inboxes: 'intents.inboxes' } },
      where: qb => {
        qb.where(`inboxes.id = ${inbox.id}`)
      },
    });
  }

  findOne(id: string): Promise<Intent> {
    return this._intentsRepository.findOne(id);
  }

  create(intent: Intent): Promise<Intent> {
    return this._intentsRepository.save(intent);
  }

  delete(intentId): Promise<UpdateResult> {
    return this._intentsRepository.update({id: intentId}, {status: IntentStatus.archived});
  }

  saveMany(intents: IntentModel[]): Promise<Intent[]> {
    return this._intentsRepository.save(intents);
  }

  updateManyByCondition(condition: any, params: any): Promise<UpdateResult> {
    return this._intentsRepository.update(condition, params);
  }

  async remove(id: string): Promise<void> {
    await this._intentsRepository.delete(id);
  }

  getRepository(): Repository<Intent> {
    return this._intentsRepository;
  }

  findNbIntent(): Promise<Array<string>> {
    
    const result =  this._intentsRepository.createQueryBuilder('intent')
    .select("DATE(intent.created_at) AS date")
    .addSelect("COUNT(*) AS count")
    .groupBy("DATE(intent.created_at)")
    .orderBy("DATE(intent.created_at)", 'ASC')
    .getRawMany();
    return result;
 }
}
