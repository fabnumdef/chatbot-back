import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Intent } from '@core/entities/intent.entity';
import { type IntentModel } from '@core/models/intent.model';
import { type UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import { IntentStatus } from '@core/enums/intent-status.enum';
import { type PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import PaginationUtils from '@core/pagination-utils';
import { type IntentFilterDto } from '@core/dto/intent-filter.dto';
import { type ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { type StatsFilterDto } from '@core/dto/stats-filter.dto';
import * as moment from 'moment';
import { AppConstants } from '@core/constant';
import { type Response } from '@core/entities/response.entity';
import { ResponseType } from '@core/enums/response-type.enum';
import { type SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import ChatbotConfigService from '../chatbot-config/chatbot-config.service';
import ResponseService from '../response/response.service';
import KnowledgeService from '../knowledge/knowledge.service';

@Injectable()
export default class IntentService {
  constructor(
    @InjectRepository(Intent)
    private readonly intentsRepository: Repository<Intent>,
    private readonly knowledgeService: KnowledgeService,
    private readonly responseService: ResponseService,
    private readonly configService: ChatbotConfigService,
  ) {}

  /**
   * Récupération de toutes les connaissances
   * Par défaut celles au statut Actif
   * @param params
   */
  async findAll(
    params: any = { status: IntentStatus.active },
  ): Promise<Intent[]> {
    return this.intentsRepository.find(params);
  }

  /**
   * Récupération de toutes les connaissances ainsi que leurs objets liés
   * @param options
   * @param filters
   * @param getHidden
   * @param getResponses
   * @param getKnowledges
   */
  async findFullIntents(
    options: PaginationQueryDto = null,
    filters: IntentFilterDto = null,
    getHidden = true,
    getResponses = true,
    getKnowledges = true,
  ): Promise<Intent[]> {
    return this.getFullIntentQueryBuilder(
      PaginationUtils.setQuery(
        options,
        Intent.getAttributesToSearch(),
        'intent',
      ),
      filters,
      null,
      getHidden,
      getResponses,
      getKnowledges,
    ).getMany();
  }

  /**
   * Récupération des connaissances par catégorie
   * @param category
   */
  async findByCategory(category: string): Promise<Intent[]> {
    return this.getIntentAndResponseQueryBuilder()
      .andWhere(`category = '${category}'`)
      .andWhere("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      .getMany();
  }

  /**
   * Récupération des connaissances paginées
   * @param options
   * @param filters
   */
  async paginate(
    options: PaginationQueryDto,
    filters: IntentFilterDto,
  ): Promise<Pagination<IntentModel>> {
    const results = await paginate(
      this.getIntentQueryBuilder(
        PaginationUtils.setQuery(
          options,
          Intent.getAttributesToSearch(),
          'intent',
        ),
        filters,
      ),
      options,
    );

    // Quand il y a des left join obligé de récupérer les join à part sinon le nombre d'items retournés pas la pagination bug
    return new Pagination(
      await Promise.all(
        results.items.map(async (item: IntentModel) => {
          const [knowledges, responses, previousIntents, nextIntents] =
            await Promise.all([
              this.knowledgeService.findByIntent(item),
              this.responseService.findByIntent(item),
              this.findPreviousIntents(item),
              this.findNextIntents(item),
            ]);
          // @ts-expect-error
          item.knowledges = knowledges;
          // @ts-expect-error
          item.responses = responses;
          // @ts-expect-error
          item.previousIntents = previousIntents;
          // @ts-expect-error
          item.nextIntents = nextIntents;

          return item;
        }),
      ),
      results.meta,
      results.links,
    );
  }

  /**
   * Création de la requête SQL pour récupérer les connaissances
   * @param whereClause
   * @param filters
   * @param getResponses
   */
  getIntentQueryBuilder(
    whereClause: string,
    filters?: IntentFilterDto,
    getResponses?: boolean,
  ): SelectQueryBuilder<any> {
    let query = this.intentsRepository
      .createQueryBuilder('intent')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training,
        ],
      })
      .andWhere(whereClause ? whereClause.toString() : "'1'");

    if (!getResponses) {
      query
        .addOrderBy(
          `case intent.status 
          when 'to_deploy' then 1
          when 'in_training' then 2
          when 'active_modified' then 3
          when 'active' then 4
          when 'to_archive' then 5
          when 'archived' then 6
          end`,
        )
        .addOrderBy(
          "case when intent.expires_at::date >= now() - interval '1 month' then intent.expires_at end",
        )
        .addOrderBy('intent.updated_at', 'DESC')
        .addOrderBy('intent.main_question', 'ASC', 'NULLS LAST');
    }

    query = this.addFilters(query, filters);
    return query;
  }

  /**
   * Création de la requête SQL pour récupérer les connaissances ainsi que les objets liés
   * @param whereClause
   * @param filters
   * @param id
   * @param getHidden
   * @param getResponses
   * @param getKnowledges
   */
  getFullIntentQueryBuilder(
    whereClause: string,
    filters: IntentFilterDto,
    id?: string,
    getHidden?: boolean,
    getResponses = true,
    getKnowledges = true,
  ): SelectQueryBuilder<any> {
    let query = this.intentsRepository
      .createQueryBuilder('intent')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training,
        ],
      })
      .andWhere(whereClause ? whereClause.toString() : "'1'")
      .andWhere(id ? `intent.id = '${id}'` : "'1'")
      .andWhere(getHidden ? "'1'" : 'hidden = false')
      .orderBy({
        'intent.id': 'ASC',
      });

    query = this.addFilters(query, filters);

    if (getKnowledges) {
      query
        .leftJoinAndSelect('intent.knowledges', 'knowledges')
        .addOrderBy('knowledges.id', 'ASC');
    }
    if (getResponses) {
      query
        .leftJoinAndSelect('intent.responses', 'responses')
        .addOrderBy('responses.id', 'ASC');
    }

    return query;
  }

  /**
   * Récupération de toutes les connaissances ainsi que leurs réponses
   */
  getIntentAndResponseQueryBuilder() {
    return this.intentsRepository
      .createQueryBuilder('intent')
      .select('intent.main_question')
      .addSelect('intent.id')
      .addSelect('intent.category')
      .leftJoinAndSelect('intent.responses', 'responses')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training,
        ],
      })
      .andWhere('hidden = false')
      .orderBy({
        'intent.main_question': 'ASC',
        'responses.id': 'ASC',
      });
  }

  /**
   * Récupération de toutes les catégories des connaissances
   * @param active
   */
  async findAllCategories(active = false): Promise<string[]> {
    const query = this.intentsRepository
      .createQueryBuilder('intent')
      .select('DISTINCT category', 'category')
      .where("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      .orderBy('category', 'ASC');

    if (active) {
      query.andWhere('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.active_modified,
          IntentStatus.in_training,
        ],
      });
    }

    const intents: Intent[] = await query.getRawMany();

    return intents.filter((i) => i.category).map((i) => i.category);
  }

  /**
   * Récupération d'une connaissance avec ses possibles connaissances liées
   * @param id
   */
  async findOne(id: string, getHidden = true): Promise<Intent> {
    const intent = await this.getFullIntentQueryBuilder(
      null,
      null,
      id,
      getHidden,
    ).getOne();
    if (!intent) {
      return;
    }
    const [previousIntents, nextIntents] = await Promise.all([
      this.findPreviousIntents(intent),

      this.findNextIntents(intent),
    ]);

    intent.previousIntents = previousIntents;

    intent.nextIntents = nextIntents;

    return intent;
  }

  /**
   * Recherche des connaissances par rapport à une query
   * @param query
   * @param intentsNumber
   * @param getResponses
   * @param excludeSt
   */
  async findIntentsMatching(
    query: string,
    intentsNumber = 1000,
    getResponses = false,
    excludeSt = false,
  ): Promise<Intent[]> {
    let intentWhereClause = PaginationUtils.setQuery(
      { query } as PaginationQueryDto,
      Intent.getAttributesToSearch(),
      'intent',
    );
    const queryBuilder = this.getIntentQueryBuilder(null, null, getResponses)
      .andWhere('hidden = False')
      .andWhere("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .andWhere('intent.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      .select('intent.id')
      .addSelect('intent.main_question')
      .addSelect('intent.category');

    if (getResponses) {
      const responseWhereClause = PaginationUtils.setQuery(
        { query } as PaginationQueryDto,
        ['response'],
        'responses',
      );
      intentWhereClause = intentWhereClause
        ? `${intentWhereClause} or ${responseWhereClause}`
        : responseWhereClause;
      return queryBuilder
        .leftJoinAndSelect('intent.responses', 'responses')
        .orderBy({
          'intent.main_question': 'ASC',
          'responses.id': 'ASC',
        })
        .andWhere(intentWhereClause ? intentWhereClause.toString() : "'1'")
        .getMany();
    }
    return queryBuilder
      .andWhere(intentWhereClause ? intentWhereClause.toString() : "'1'")
      .take(intentsNumber)
      .getMany();
  }

  /**
   * Récupération uniquement des ids et des questions principales des connaissances
   * @param intentsId
   */
  async findIntentsMainQuestions(intentsId: string[]): Promise<Intent[]> {
    const status = [
      IntentStatus.to_deploy,
      IntentStatus.active,
      IntentStatus.active_modified,
      IntentStatus.in_training,
    ];
    return this.intentsRepository.find({
      select: ['id', 'main_question'],
      where: {
        id: In(intentsId),
        status: In(status),
        hidden: false,
      },
    });
  }

  /**
   * Vérification si une connaissance existe
   * @param id
   */
  async intentExists(id: string): Promise<boolean> {
    return !!(await this.findOne(id, false));
  }

  /**
   * Création / Edition d'une connaissance
   * @param intent
   * @param id
   */
  async createEdit(intent: Intent, id?: string): Promise<Intent> {
    switch (intent.status) {
      // Si une connaissance existe on met à jour son statut pour qu'elle soit ingérée par RASA
      case IntentStatus.active:
      case IntentStatus.in_training:
        intent.status = IntentStatus.active_modified;
        break;
    }
    const intentCreatedEdited = await this.intentsRepository.save(intent);
    // Si édition de l'ID d'une connaissance on doit supprimer l'ancienne
    if (id) {
      await this.delete(id);
      await this.responseService.updateIntentResponses(id, intent.id);
    }
    await this.updateNeedTraining();
    return intentCreatedEdited;
  }

  /**
   * Archivation d'une connaissance
   * @param intentId
   */
  async delete(intentId): Promise<UpdateResult> {
    if (AppConstants.General.excluded_Ids.includes(intentId)) {
      throw new HttpException(
        "Impossible de supprimer les phrases de présentation et d'hors sujet.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const intentDeleted = await this.intentsRepository.update(
      { id: intentId },
      { status: IntentStatus.to_archive },
    );
    await this.updateNeedTraining();
    return intentDeleted;
  }

  /**
   * Sauvegarde de plusieurs connaissances d'un coup
   * @param intents
   */
  async saveMany(intents: IntentModel[]): Promise<Intent[]> {
    const intentsCreated = await this.intentsRepository.save(intents);
    await this.updateNeedTraining();
    return intentsCreated;
  }

  /**
   * Mise à jour de plusieurs connaissances d'un coup
   * @param condition
   * @param params
   */
  async updateManyByCondition(
    condition: any,
    params: any,
  ): Promise<UpdateResult> {
    const intentsUpdated = await this.intentsRepository.update(
      condition,
      params,
    );
    await this.updateNeedTraining();
    return intentsUpdated;
  }

  /**
   * Récupération du repository
   */
  getRepository(): Repository<Intent> {
    return this.intentsRepository;
  }

  /**
   * Récupération du nombre de connaissances créées par jour
   * Possibilité de filtrer par dates
   * @param filters
   */
  async findNbIntentByTime(filters: StatsFilterDto): Promise<string[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().subtract(1, 'month').format('YYYY-MM-DD');
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');
    const query = this.intentsRepository
      .createQueryBuilder('intent')
      .select('DATE(intent.created_at) AS date')
      .addSelect('COUNT(*) AS count')
      .where(`DATE(intent.created_at) >= '${startDate}'`)
      .andWhere(`DATE(intent.created_at) <= '${endDate}'`)
      .groupBy('DATE(intent.created_at)')
      .orderBy('DATE(intent.created_at)', 'ASC');
    return query.getRawMany();
  }

  /**
   * Récupération des connaissances qui n'ont jamais été utilisée (moins de une fois) dans le Chatbot
   * Possibilité de filtrer par dates
   * @param filters
   */
  async findNeverUsedIntent(filters: StatsFilterDto): Promise<string[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this.intentsRepository
      .createQueryBuilder('intent')
      .select('intent.main_question as question')
      .leftJoin(
        (subq) => {
          subq
            .from('intent', 'intent')
            .select('intent.id AS intentid')
            .innerJoin('inbox', 'inbox', 'inbox.intent = intent.id');
          if (startDate) {
            subq.where(`DATE(inbox.created_at) >= '${startDate}'`);
          }
          if (endDate) {
            subq.andWhere(`DATE(inbox.created_at) <= '${endDate}'`);
          }
          return subq;
        },
        't1',
        't1.intentid = intent.id',
      )
      .where("intent.id NOT LIKE 'st\\_%' ESCAPE '\\'")
      .groupBy('intent.main_question')
      .having('COUNT(t1.intentid) < 2')
      .orderBy('intent.main_question', 'ASC');

    return query.getRawMany();
  }

  /**
   * Récupération de l'arbre global des connaissances avec leurs liaisons
   * @param options
   * @param filters
   */
  public async getFullTree(
    options: PaginationQueryDto,
    filters: IntentFilterDto,
  ): Promise<Intent[]> {
    const intents: Intent[] = await this.findFullIntents(
      options,
      filters,
      true,
      true,
      false,
    );
    const allIntents: Intent[] = await this.findFullIntents(
      null,
      null,
      true,
      true,
      false,
    );
    return this.buildIntentsTree(intents, allIntents);
  }

  /**
   * Récupération des connaissances qui pointe vers la connaissance passée en argument
   * @param intent
   * @private
   */
  private async findPreviousIntents(intent: IntentModel): Promise<Intent[]> {
    const sql = this.intentsRepository
      .createQueryBuilder('intent')
      .select([
        'intent.id as id',
        'main_question',
        'category',
        '(select count(*) from response where intent.id = response."intentId" and type = \'quick_reply\') as linked_responses',
      ])
      .leftJoin('intent.responses', 'responses')
      .where(`responses.response like '%<${intent.id}>%'`);

    return sql.getRawMany();
  }

  /**
   * Récupération des connaissances présentes dans la réponse de la connaissance passée en argument
   * @param intent
   * @private
   */
  private async findNextIntents(intent: IntentModel): Promise<Intent[]> {
    // Récupération des réponses de la connaissance
    let intentsId = (await this.responseService.findByIntent(intent))
      .map((r: Response) => {
        // Si la réponse n'est pas une réponse répide ou un bouton, on passe
        if (
          ![ResponseType.quick_reply, ResponseType.button].includes(
            r.response_type,
          ) ||
          !r.response
        ) {
          return null;
        }
        // On récupère tous les liens des réponses rapides / boutons
        return r.response
          .split(';')
          .map((text) =>
            text.substring(text.indexOf('<') + 1, text.indexOf('>')).trim(),
          );
      })
      .filter((r) => !!r);
    intentsId = [].concat(...intentsId);
    if (intentsId.length < 1) {
      return;
    }
    const sql = this.intentsRepository
      .createQueryBuilder('intent')
      .select([
        'intent.id as id',
        'main_question',
        'category',
        '(select count(*) from response where intent.id = response."intentId" and type = \'quick_reply\') as linked_responses',
      ])
      .where('intent.id IN (:...ids)', {
        ids: intentsId,
      });

    return sql.getRawMany();
  }

  /**
   * Mise à jour de la configuration si au moins une connaissance a besoin d'être ingérée par RASA
   * @private
   */
  private async updateNeedTraining() {
    const needTraining = await this.intentsRepository.count({
      where: {
        status: In([
          IntentStatus.to_deploy,
          IntentStatus.active_modified,
          IntentStatus.to_archive,
        ]),
      },
    });
    await this.configService.update({
      need_training: needTraining > 0,
    } as ChatbotConfig);
  }

  /**
   * Construction de l'arbre des connaissances
   * @param intents
   * @param allIntents
   * @private
   */
  private buildIntentsTree(intents: Intent[], allIntents: Intent[]): Intent[] {
    const rootIntents: Intent[] = [];
    intents.forEach((intent) => {
      // On récupère les racines de l'arbre
      // Toutes les connaissances qui ne sont pas présentes dans les réponses des autres
      if (
        !allIntents.find((i) =>
          i.responses.find((r) => r.response.includes(intent.id)),
        )
      ) {
        // @ts-expect-error
        intent.previousIntents = null;
        rootIntents.push(intent);
      }
    });
    this.buildIntentBranch(rootIntents, allIntents);
    return rootIntents;
  }

  async resetData() {
    await this.intentsRepository.createQueryBuilder().delete().execute();
  }

  /**
   * Construction des branches des connaissances'
   * @param rootIntents
   * @param fullIntents
   * @private
   */
  private buildIntentBranch(rootIntents: Intent[], fullIntents: Intent[]) {
    // Pour chaque racine
    rootIntents.forEach((rootIntent) => {
      const intentsTmp: string[][] = rootIntent.responses.map((r: Response) => {
        if (
          ![ResponseType.quick_reply, ResponseType.button].includes(
            r.response_type,
          ) ||
          !r.response
        ) {
          return null;
        }
        return r.response
          .split(';')
          .map((text) =>
            text.substring(text.indexOf('<') + 1, text.indexOf('>')).trim(),
          );
      });
      let intentsId: string[] = [].concat(...intentsTmp);
      // On exclut les connaissances qui sont déjà des racines pour éviter une boucle infinie ou des branches en doublon
      intentsId = intentsId.filter(
        (id) =>
          // @ts-expect-error
          id && !rootIntent.parents?.includes(id),
      );
      if (intentsId.length < 1) {
        // @ts-expect-error
        rootIntent.nextIntents = [];
        return;
      }
      // @ts-expect-error
      rootIntent.nextIntents = fullIntents.filter((intent) =>
        intentsId.includes(intent.id),
      );
    });

    let nextRootIntents = rootIntents.map((r: any | Intent) => {
      r.nextIntents = r.nextIntents.map((n) => {
        n.parents = r.parents ? r.parents : [];
        n.parents.push(r.id);
        return n;
      });
      return r.nextIntents;
    });
    nextRootIntents = [].concat(...nextRootIntents);
    if (!nextRootIntents || nextRootIntents.length < 1) {
      return;
    }
    // On itère pour construire la branche complète
    this.buildIntentBranch(nextRootIntents, fullIntents);
  }

  /**
   * Retourne le query builder avec les filtres pour les connaissances
   * @param query
   * @param filters
   * @private
   */
  private addFilters(
    query: SelectQueryBuilder<any>,
    filters: IntentFilterDto,
  ): SelectQueryBuilder<any> {
    if (!filters) {
      return query;
    }
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('intent.category IN (:...categories)', {
        categories: filters.categories,
      });
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
      query.andWhere(
        '(SELECT count(*) FROM "knowledge" WHERE "knowledge"."intentId" = "intent"."id") < 2',
      );
    }
    if (filters.users && filters.users.length > 0) {
      query.andWhere('intent.userEmail IN (:...users)', {
        users: filters.users,
      });
    }

    return query;
  }
}
