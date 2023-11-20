import { StatsFilterDto } from '@core/dto/stats-filter.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, LessThan, Repository, Between } from 'typeorm';
import { Inbox } from '@core/entities/inbox.entity';
import { InboxStatus, InboxStatus_Fr } from '@core/enums/inbox-status.enum';
import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { PaginationUtils } from '@core/pagination-utils';
import { InboxFilterDto } from '@core/dto/inbox-filter.dto';
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import { Knowledge } from '@core/entities/knowledge.entity';
import { IntentStatus } from '@core/enums/intent-status.enum';
import * as moment from 'moment';
import { StatsMostAskedQuestionsDto } from '@core/dto/stats-most-asked-questions.dto';
import { Feedback } from '@core/entities/feedback.entity';
import * as escape from 'pg-escape';

import { AppConstants } from '@core/constant';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Events } from '@core/entities/events.entity';
import * as fs from 'fs';
import { WorkBook } from 'xlsx';
import { StatsMostAskedCategoriesDto } from '@core/dto/stats-most-asked-categories.dto';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';
import { UserService } from '../user/user.service';
import { IntentService } from '../intent/intent.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { MailService } from '../shared/services/mail.service';

const XLSX = require('xlsx');
const uuid = require('uuid');

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(Inbox)
    private readonly _inboxesRepository: Repository<Inbox>,
    private readonly _knowledgeService: KnowledgeService,
    private readonly _intentService: IntentService,
    private readonly _userService: UserService,
    private readonly _mailService: MailService,
    @InjectRepository(Events)
    private readonly _eventsRepository: Repository<Events>,
  ) {}

  /**
   * Rétention des données pour 3ans maximum
   * @private
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private _clearOldValues() {
    const threeYearsAgo = moment().subtract(3, 'years').unix();
    this._clearInboxes(threeYearsAgo);
    this._clearEvents(threeYearsAgo);
  }

  /**
   * Récupération de toutes les requêtes
   * Par défaut celles au statut A traiter
   * @param params
   */
  findAll(
    params = {
      where: {
        status: InboxStatus.pending,
      },
    },
  ): Promise<Inbox[]> {
    return this._inboxesRepository.find(params);
  }

  /**
   * Récupération d'une requête
   * @param inboxId
   */
  findOne(inboxId) {
    return this._inboxesRepository.findOne({
      where: {
        id: inboxId,
      },
      relations: {
        intent: true,
      },
    });
  }

  /**
   * Sauvegarde d'une requête
   * @param inbox
   */
  save(inbox: Inbox): Promise<Inbox> {
    return this._inboxesRepository.save(inbox);
  }

  /**
   * Récupération des requêtes paginées
   * @param options
   * @param filters
   */
  async paginate(
    options: PaginationQueryDto,
    filters: InboxFilterDto,
  ): Promise<Pagination<Inbox>> {
    return paginate<Inbox>(
      this.getInboxQueryBuilder(
        PaginationUtils.setQuery(options, Inbox.getAttributesToSearch()),
        filters,
      ),
      options,
    );
  }

  /**
   * Création de la requête SQL de récupération des requêtes
   * @param whereClause
   * @param filters
   */
  getInboxQueryBuilder(whereClause: string, filters?: InboxFilterDto) {
    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .leftJoinAndSelect('inbox.intent', 'intent')
      .leftJoin('inbox.user', 'user')
      .addSelect([
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.role',
      ])
      .andWhere(whereClause ? whereClause.toString() : `'1'`)
      .orderBy({
        'inbox.timestamp': 'DESC',
      });

    if (!filters) {
      return query;
    }
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('intent.category IN (:...categories)', {
        categories: filters.categories,
      });
    }
    if (filters.statutes && filters.statutes.length > 0) {
      query.andWhere('inbox.status IN (:...statutes)', {
        statutes: filters.statutes,
      });
    }
    if (filters.startDate) {
      const startDate = moment(filters.startDate, 'DD/MM/YYYY').format(
        'YYYY-MM-DD',
      );
      query.andWhere(`to_timestamp(inbox.timestamp)::date >= '${startDate}'`);
    }
    if (filters.endDate) {
      const endDate = moment(filters.endDate, 'DD/MM/YYYY').format(
        'YYYY-MM-DD',
      );
      query.andWhere(`to_timestamp(inbox.timestamp)::date <= '${endDate}'`);
    }
    if (filters.assignedTo) {
      query.andWhere(`inbox.user.email = '${filters.assignedTo}'`);
    }
    if (filters.assignedToAll) {
      query.andWhere(`inbox.user.email is not null`);
    }

    return query;
  }

  /**
   * Validation d'une requête
   * Cela se traduit par la création d'une question similaire
   * @param inboxId
   */
  async validate(inboxId): Promise<UpdateResult> {
    const inbox = await this.findOne(inboxId);
    const newKnowledge: Knowledge = {
      id: null,
      intent: inbox.intent,
      question: inbox.question,
    };
    await this._knowledgeService.createSafe(newKnowledge);
    if (inbox.intent.status === IntentStatus.active) {
      await this._intentService.updateManyByCondition(
        { id: inbox.intent.id },
        { status: IntentStatus.active_modified },
      );
    }
    return this._inboxesRepository.update(
      { id: inboxId },
      { status: InboxStatus.confirmed },
    );
  }

  /**
   * Assignation d'une requête à un utilisateur
   * Envoi d'un email à celui-ci avec les informations de la requête à traiter
   * @param inboxId
   * @param userEmail
   */
  async assign(inboxId: number, userEmail?: string): Promise<UpdateResult> {
    const user = userEmail ? await this._userService.findOne(userEmail) : null;
    const inbox = await this.findOne(inboxId);
    const toReturn = await this._inboxesRepository.update(
      { id: inboxId },
      { user },
    );

    if (!user) {
      return toReturn;
    }

    await this._mailService
      .sendEmail(
        user.email,
        'Usine à Chatbots - Une requête vous a été attribuée',
        'assign-intent',
        {
          // Data to be sent to template engine.
          firstName: user.first_name,
          question: inbox.question,
          url: `${process.env.HOST_URL}/backoffice`,
        },
      )
      .then(() => {});

    return toReturn;
  }

  /**
   * Archivation d'une requête
   * @param inboxId
   */
  delete(inboxId): Promise<UpdateResult> {
    return this._inboxesRepository.update(
      { id: inboxId },
      { status: InboxStatus.archived },
    );
  }

  /**
   * Récupération du nombre de requêtes par jour
   * Possibilité de filtrer par dates
   * @param filters
   */
  findNbInboxByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().subtract(1, 'month').format('YYYY-MM-DD');
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');
    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('DATE(to_timestamp(inbox.timestamp)) AS date')
      .addSelect('COUNT(*) AS count')
      .where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
      .andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
      .groupBy('DATE(to_timestamp(inbox.timestamp))')
      .orderBy('DATE(to_timestamp(inbox.timestamp))', 'ASC');
    return query.getRawMany();
  }

  /**
   * Récupération du nombre de visiteurs par jour
   * Possibilité de filtrer par dates
   * @param filters
   */
  findNbVisitorsByTime(filters: StatsFilterDto): Promise<Array<string>> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().subtract(1, 'month').format('YYYY-MM-DD');
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('DATE(to_timestamp(inbox.timestamp)) AS date')
      .addSelect('COUNT(DISTINCT sender_id) AS count')
      .where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`)
      .andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`)
      .groupBy('DATE(to_timestamp(inbox.timestamp))')
      .orderBy('DATE(to_timestamp(inbox.timestamp))', 'ASC');
    return query.getRawMany();
  }

  /**
   * Récupération du nombre unique de visiteurs
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

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('COUNT(DISTINCT sender_id) AS visitors');
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération des questions les plus posées
   * Possibilité de filtrer par date
   * @param filters
   * @param feedbackStatus
   */
  findMostAskedQuestions(
    filters: StatsFilterDto,
    feedbackStatus?: FeedbackStatus,
  ): Promise<StatsMostAskedQuestionsDto[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('int.main_question AS question')
      .addSelect('COUNT(inbox.intent) AS count')
      .innerJoin('intent', 'int', 'int.id = inbox.intent')
      // Remove phrase_presentation & co
      .where('int.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      // Remove small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`);
    if (startDate) {
      query.andWhere(
        `DATE(to_timestamp(inbox.${
          feedbackStatus ? 'feedback_timestamp' : 'timestamp'
        })) >= '${startDate}'`,
      );
    }
    if (endDate) {
      query.andWhere(
        `DATE(to_timestamp(inbox.${
          feedbackStatus ? 'feedback_timestamp' : 'timestamp'
        })) <= '${endDate}'`,
      );
    }
    if (feedbackStatus) {
      query.andWhere(`inbox.feedback_status = '${feedbackStatus}'`);
    }
    query
      .groupBy('int.main_question')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  /**
   * Récupération des catégories les plus demandées
   * Possibilité de filtrer par date
   * @param filters
   * @param feedbackStatus
   */
  findMostAskedCategories(
    filters: StatsFilterDto,
    feedbackStatus?: FeedbackStatus,
  ): Promise<StatsMostAskedCategoriesDto[]> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('int.category AS category')
      .addSelect('COUNT(inbox.intent) AS count')
      .innerJoin('intent', 'int', 'int.id = inbox.intent')
      // Remove phrase_presentation & co
      .where('int.id NOT IN (:...excludedIds)', {
        excludedIds: AppConstants.General.excluded_Ids,
      })
      // Remove small talks
      .andWhere(`int.id NOT LIKE 'st\\_%' ESCAPE '\\'`);
    if (startDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }
    if (feedbackStatus) {
      query.andWhere(`inbox.feedback_status = '${feedbackStatus}'`);
    }
    query
      .groupBy('int.category')
      .orderBy('count', 'DESC', 'NULLS LAST')
      .limit(15);
    return query.getRawMany();
  }

  /**
   * Récupération du nombre moyen de questions par visiteur
   * Possibilité de filtrer par date
   * @param filters
   */
  findAvgQuestPerVisitor(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select(
        'ROUND(count(*) * 1.0 / count(distinct inbox.sender_id), 2) as averageQuestions',
      );
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération du temps moyen de réponse de RASA
   * Possibilité de filtrer par date
   * @param filters
   */
  findAvgResponseTime(filters: StatsFilterDto): Promise<string> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select('ROUND(avg(inbox.response_time), 0) as averageResponse');
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération du ratio de réponses renvoyées par RASA (pourcentage de questions auquel RASA a su renvoyer une réponse, pas forcément la bonne)
   * Possibilité de filtrer par date
   * @param filters
   * @param confidence
   */
  async findRatioResponseOk(
    filters: StatsFilterDto,
    confidence = 0.6,
  ): Promise<string> {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    let additionnalWhereClause = startDate
      ? `AND DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`
      : '';
    additionnalWhereClause += endDate
      ? ` AND DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`
      : additionnalWhereClause;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select(
        `100 * (SELECT COUNT(inbox.id) from inbox WHERE inbox.confidence >= ${confidence.toString(
          10,
        )} ${additionnalWhereClause})/COUNT(inbox.id) as ratioResponseOk`,
      );
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération du nombre de feedbacks totaux
   * Possibilité de filtrer par date
   * @param filters
   * @param feedbackStatus
   */
  async findCountFeedback(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ) {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    let additionnalWhereClause = startDate
      ? `AND DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`
      : '';
    additionnalWhereClause += endDate
      ? ` AND DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`
      : additionnalWhereClause;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select(`COUNT(inbox.id)`, 'countFeedback')
      .where(
        `inbox.feedback_status = '${feedbackStatus}' ${additionnalWhereClause}`,
      );
    if (startDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Récupération du ratio de feedbacks par rapport au nombre de questions posées
   * Possibilité de filtrer par date
   * @param filters
   * @param feedbackStatus
   */
  async findRatioFeedback(
    filters: StatsFilterDto,
    feedbackStatus: FeedbackStatus,
  ) {
    const startDate = filters.startDate
      ? moment(filters.startDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;
    const endDate = filters.endDate
      ? moment(filters.endDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : null;

    let additionnalWhereClause = startDate
      ? `AND DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`
      : '';
    additionnalWhereClause += endDate
      ? ` AND DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`
      : additionnalWhereClause;

    const query = this._inboxesRepository
      .createQueryBuilder('inbox')
      .select(
        `100 * (SELECT COUNT(inbox.id) from inbox WHERE inbox.feedback_status = '${feedbackStatus}' ${additionnalWhereClause})/COUNT(inbox.id)`,
        'ratioFeedback',
      );
    if (startDate) {
      query.where(`DATE(to_timestamp(inbox.timestamp)) >= '${startDate}'`);
    }
    if (endDate) {
      query.andWhere(`DATE(to_timestamp(inbox.timestamp)) <= '${endDate}'`);
    }

    return query.getRawOne();
  }

  /**
   * Mise à jour d'une requête avec un feedback
   * Retourne true si une requête a été trouvée, false sinon
   * @param feedback
   */
  public async updateInboxWithFeedback(feedback: Feedback): Promise<boolean> {
    const tenMinutes = 10 * 60;
    // We search the right inbox +- 10 minutes
    const inbox: Inbox = await this._inboxesRepository
      .createQueryBuilder('inbox')
      .where({
        timestamp: Between(
          feedback.timestamp - tenMinutes,
          feedback.timestamp + tenMinutes,
        ),
        sender_id: feedback.sender_id,
      })
      .andWhere(
        escape(
          `upper(%I) like %L`,
          'question',
          feedback.user_question.toUpperCase(),
        ),
      )
      .getOne();

    if (!inbox) {
      return false;
    }

    // @ts-ignore
    await this._inboxesRepository.update(inbox.id, {
      // @ts-ignore
      status: feedback.status,
      feedback_status: feedback.status,
      feedback_timestamp: parseFloat(moment(feedback.created_at).format('x')),
    });
    return true;
  }

  /**
   * Export Excel des requêtes
   * @param options
   * @param filters
   */
  exportXls(
    options: PaginationQueryDto,
    filters: InboxFilterDto,
  ): Promise<fs.ReadStream> {
    return new Promise<fs.ReadStream>(async (resolve, reject) => {
      const workbook = await this._generateWorkbook(options, filters);

      const guidForClient = uuid.v1();
      const pathNameWithGuid = `${guidForClient}_result.xlsx`;
      XLSX.writeFile(workbook, pathNameWithGuid);
      const stream = fs.createReadStream(pathNameWithGuid);
      stream.on('close', () => {
        fs.unlink(pathNameWithGuid, (error) => {
          if (error) {
            throw error;
          }
        });
      });
      resolve(stream);
    });
  }

  /**
   * Génération du fichier Excel
   * @param options
   * @param filters
   * @private
   */
  private async _generateWorkbook(
    options: PaginationQueryDto,
    filters: InboxFilterDto,
  ): Promise<WorkBook> {
    const workbook = XLSX.utils.book_new();
    const worksheet_data = await this._generateWorksheet(options, filters);
    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
    XLSX.utils.book_append_sheet(workbook, worksheet);
    return workbook;
  }

  /**
   * Génération de la feuille de données
   * @param options
   * @param filters
   * @private
   */
  private async _generateWorksheet(
    options: PaginationQueryDto,
    filters: InboxFilterDto,
  ) {
    const inboxes = await this.getInboxQueryBuilder(
      PaginationUtils.setQuery(options, Inbox.getAttributesToSearch()),
      filters,
    ).getMany();
    let idx = 1;
    const rows = [
      [
        'Question',
        'Catégorie',
        'Statut',
        '% de pertinence',
        'Date de la question',
      ],
    ];
    inboxes.forEach((inbox: Inbox) => {
      idx += 1;
      rows.push(this._generateRow(inbox, idx));
    });
    return rows;
  }

  /**
   * Génération des lignes pour la feuille de données
   * @param inbox
   * @param idx
   * @private
   */
  private _generateRow(inbox: Inbox, idx: number) {
    return [
      inbox.question,
      inbox.intent?.category,
      InboxStatus_Fr[inbox.status],
      inbox.confidence ? Math.round(inbox.confidence * 100).toString(10) : '0',
      moment(inbox.created_at).format('DD/MM/YYYY hh:mm:ss'),
    ];
  }

  /**
   * Anonymisation de toutes les requêtes plus vieilles que le timestamp passé en argument
   * @param timestamp
   * @private
   */
  private async _clearInboxes(timestamp: number) {
    await this._inboxesRepository.update(
      {
        timestamp: LessThan(timestamp),
      },
      { question: null, response: null },
    );
  }

  /**
   * Anonymisation de tout les events RASA plus vieux que le timestamp passé en argument
   * @param timestamp
   * @private
   */
  private async _clearEvents(timestamp: number) {
    await this._eventsRepository.update(
      {
        timestamp: LessThan(timestamp),
        type_name: 'user',
      },
      { data: null },
    );
  }
}
