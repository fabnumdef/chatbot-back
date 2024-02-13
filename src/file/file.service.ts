import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TemplateFileCheckResumeDto } from '@core/dto/template-file-check-resume.dto';
import { Sheet2JSONOpts, WorkBook, WorkSheet } from 'xlsx';
import { TemplateFileDto } from '@core/dto/template-file.dto';
import { ImportFileDto } from '@core/dto/import-file.dto';
import { IntentModel } from '@core/models/intent.model';
import { IntentStatus } from '@core/enums/intent-status.enum';
import { Intent } from '@core/entities/intent.entity';
import { Knowledge } from '@core/entities/knowledge.entity';
import { plainToInstance } from 'class-transformer';
import { Response } from '@core/entities/response.entity';
import {
  ResponseType,
  ResponseType_Fr,
  ResponseType_ReverseFr,
} from '@core/enums/response-type.enum';
import { ImportResponseDto } from '@core/dto/import-response.dto';
import * as fs from 'fs';
import { In, Not, Repository } from 'typeorm';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { FileHistoric } from '@core/entities/file.entity';
import { mkdirp } from 'mkdirp';
import snakecaseKeys = require('snakecase-keys');
import { Cron, CronExpression } from '@nestjs/schedule';
import * as moment from 'moment';
import { AppConstants } from '@core/constant';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import ChatbotConfigService from '../chatbot-config/chatbot-config.service';
import BotLogger from '../logger/bot.logger';
import ResponseService from '../response/response.service';
import KnowledgeService from '../knowledge/knowledge.service';
import IntentService from '../intent/intent.service';

const XLSX = require('xlsx');
const uuid = require('uuid');

@Injectable()
export default class FileService {
  private xlsx = XLSX;

  private historicDir = path.resolve(__dirname, '../../historic');

  private readonly logger = new BotLogger('FileService');

  constructor(
    private readonly intentService: IntentService,
    private readonly knowledgeService: KnowledgeService,
    private readonly responseService: ResponseService,
    private readonly configService: ChatbotConfigService,
    @InjectRepository(FileHistoric)
    private readonly fileHistoricRepository: Repository<FileHistoric>,
  ) {
    // Création du dossier s'il n'existe pas
    mkdirp(this.historicDir).then();
  }

  /**
   * Vérification du fichier Excel contenant les connaissances (intents)
   * Lecture du fichier puis vérification de celui-ci
   * Renvoi d'un object contenant plusieurs informations dont les warnings et les errors par ligne
   * @param file
   */
  checkFile(file): TemplateFileCheckResumeDto {
    let workbook: WorkBook;
    let worksheet: WorkSheet;
    let templateFile: TemplateFileDto[];
    try {
      workbook = this.xlsx.read(file.buffer);
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      templateFile = this.convertExcelToJson(worksheet);
    } catch (error) {
      this.logger.error('Erreur lors de la lecture du fichier', error);
      throw new HttpException(
        'Le fichier fournit ne peut pas être lu.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const templateFileCheckResume = new TemplateFileCheckResumeDto();
    this.computeTemplateFile(templateFile, templateFileCheckResume);
    this.fillCheckFile(templateFile, templateFileCheckResume);

    return templateFileCheckResume;
  }

  /**
   * Import d'un fichier Excel
   * @param file
   * @param importFileDto
   */
  async importFile(
    file: any,
    importFileDto: ImportFileDto,
  ): Promise<ImportResponseDto> {
    const workbook: WorkBook = XLSX.read(file.buffer);
    const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
    const templateFile: TemplateFileDto[] = this.convertExcelToJson(worksheet);
    try {
      this.logger.log('Importing File');
      await this.configService.update(<ChatbotConfig>{ is_blocked: true });
      const toReturn = await this.templateFileToDb(templateFile, importFileDto);
      await this.configService.update(<ChatbotConfig>{ is_blocked: false });
      this.logger.log('Finishing importing File');
      return toReturn;
    } catch (e) {
      await this.configService.update(<ChatbotConfig>{ is_blocked: false });
    }
  }

  /**
   * Export des connaissances dans un fichier Excel
   */
  exportXls(): Promise<fs.ReadStream> {
    return new Promise<fs.ReadStream>(async (resolve, reject) => {
      const workbook = await this.generateWorkbook();

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
   * Sauvegarde des connaissances dans un fichier Excel s'il y a eu un entraînement de l'IA dans la journée
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeHistoricFile() {
    const botConfig = await this.configService.getChatbotConfig();
    if (
      botConfig.last_training_at &&
      moment().diff(moment(botConfig.last_training_at), 'hours') > 24
    ) {
      return;
    }
    this.logger.log('Storing historic file');
    const workbook = await this.generateWorkbook();

    const timestamp = Date.now();
    const pathNameWithGuid = `base_connaissance-${timestamp}.xlsx`;
    XLSX.writeFile(workbook, path.resolve(this.historicDir, pathNameWithGuid));

    await this.fileHistoricRepository.save({ name: pathNameWithGuid });
    this.logger.log('Finish storing historic file');
  }

  /**
   * Récupération de toutes les sauvegardes des connaissances
   */
  async findAll() {
    return this.fileHistoricRepository.find();
  }

  /** ********************************************************************************** PRIVATE FUNCTIONS *********************************************************************************** */

  /**
   * Converti une feuille excel en entrée vers un tableau d'objets TemplateFileDto
   * @param worksheet
   */
  private convertExcelToJson(worksheet: WorkSheet): TemplateFileDto[] {
    const headers = {
      ID: 'id',
      Catégorie: 'category',
      Question: 'main_question',
      'Type de réponse': 'response_type',
      'Réponse(s)': 'response',
      'Questions synonymes (à séparer par un point-virgule ;)': 'questions',
      'Expire le (DD/MM/YYYY)': 'expires_at',
    };
    const options: Sheet2JSONOpts = {};
    // Converti le fichier excel en JSON brut
    const excelJson = this.xlsx.utils.sheet_to_json(worksheet, options);
    return excelJson.map((t: TemplateFileDto, idx: number) => {
      // On filtre les données utiles, si la colonne n'est pas utile, on la supprime
      for (const key of Object.keys(t)) {
        if (headers[key]) {
          t[headers[key]] = t[key];
        }
        delete t[key];
      }
      // On enlève les caractères unicode des ids ainsi que les espaces qu'on remplace par un _
      t.id = t.id
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\W/g, '_');
      if (!t.id) {
        t.id = excelJson[idx - 1].id;
      }
      t.category = t.category?.trim();
      t.main_question = t.main_question?.trim();
      // Base de questions similaires servant à entraîner l'IA, elles sont séparées par des points virgule
      t.questions = t.questions
        ? (<any>t.questions)
            .split(';')
            .map((q) => q.trim())
            .filter((q) => !!q)
        : [];
      t.response_type =
        ResponseType[ResponseType_ReverseFr[t.response_type?.trim()]];
      t.expires_at = t.expires_at ? moment(t.expires_at, 'DD/MM/YYYY') : null;
      // Formatage des sauts de lignes Windows pour éviter de les doubler sous linux
      t.response = t.response?.replace(/(\r\n|\r|\n){2,}/g, '\n');
      return t;
    });
  }

  /**
   * Parcours du fichier excel et vérification que tout les éléments requis sont présents
   * @param templateFile
   * @param templateFileCheckResume
   */
  private fillCheckFile(
    templateFile: TemplateFileDto[],
    templateFileCheckResume?: TemplateFileCheckResumeDto,
  ): void | boolean {
    templateFile.forEach((excelRow: TemplateFileDto, index: number) => {
      const excelIndex = index + 2;
      // Erreurs
      if (!excelRow.id) {
        this.addMessage(
          templateFileCheckResume.errors,
          excelIndex,
          `L'ID n'est pas renseigné.`,
        );
      }
      if (excelRow.response && !excelRow.response_type) {
        this.addMessage(
          templateFileCheckResume.errors,
          excelIndex,
          `Le type de réponse n'est pas renseigné.`,
        );
      }
      if (!excelRow.response && excelRow.response_type) {
        this.addMessage(
          templateFileCheckResume.errors,
          excelIndex,
          `La réponse n'est pas renseignée.`,
        );
      }
      if (!excelRow.response && !excelRow.response_type) {
        this.addMessage(
          templateFileCheckResume.errors,
          excelIndex,
          `La réponse et le type de réponse n'est pas renseigné.`,
        );
      }
      if (
        [
          ResponseType.quick_reply,
          ResponseType.image,
          ResponseType.button,
        ].includes(excelRow.response_type) &&
        (templateFile[index - 1]?.response_type !== ResponseType.text ||
          templateFile[index - 1]?.id !== excelRow.id)
      ) {
        this.addMessage(
          templateFileCheckResume.errors,
          excelIndex,
          `Ce type de réponse nécessite d'être précédée d'une réponse de type texte.`,
        );
      }
      // S'il y a une question principale, il est censé y avoir une réponse, une catégorie etc ...
      if (excelRow.main_question) {
        // Avertissements (non bloquant)
        if (!excelRow.category) {
          this.addMessage(
            templateFileCheckResume.warnings,
            excelIndex,
            `La catégorie n'est pas renseignée.`,
          );
        }
        if (excelRow.questions.length < 1) {
          this.addMessage(
            templateFileCheckResume.warnings,
            excelIndex,
            `Aucune question synonyme n'a été renseignée, le chatbot aura du mal à reconnaitre cette demande.`,
          );
        }
        // S'il n'y a pas de question principale, c'est censé être une suite de réponse (et donc avoir une question principale reliée ou un lien vers cet id)
      } else {
        const excludedIds = AppConstants.General.excluded_Ids;
        const mainQuestion = templateFile.find(
          (t) =>
            (t.id === excelRow.id && !!t.main_question) ||
            (t.response && t.response.includes(`<${excelRow.id}>`)),
        );
        if (!mainQuestion && !excludedIds.includes(excelRow.id)) {
          this.addMessage(
            templateFileCheckResume.errors,
            excelIndex,
            `Aucune question n'est renseignée pour cet identifiant.`,
          );
        }
      }
    });
  }

  /**
   * Extrait des premières stats du fichier excel vers le TemplateFileCheckResumeDto
   * @param templateFile
   * @param templateFileCheckResume
   */
  private computeTemplateFile(
    templateFile: TemplateFileDto[],
    templateFileCheckResume: TemplateFileCheckResumeDto,
  ): void {
    templateFileCheckResume.categories = Array.from(
      new Set(templateFile.map((t) => t.category)),
    ).filter((v) => !!v);
    templateFileCheckResume.questionsNumber = templateFile.filter(
      (t) => !!t.main_question,
    ).length;
  }

  /**
   * Rajout d'un message à un objet clef / valeur
   * Rajoute la clef (numéro de l'index) si elle n'existe pas
   * @param keyValueObject
   * @param index
   * @param message
   */
  private addMessage(
    keyValueObject: { [key: string]: string },
    index: number,
    message: string,
  ) {
    if (!keyValueObject[index]) {
      keyValueObject[index] = '';
    }
    keyValueObject[index] += keyValueObject[index] ? `\n` : '';
    keyValueObject[index] += message;
  }

  /**
   * Mise en forme des données avant la sauvegarde dans la BDD
   * @param templateFile
   * @param importFileDto
   * @private
   */
  private async templateFileToDb(
    templateFile: TemplateFileDto[],
    importFileDto: ImportFileDto,
  ): Promise<ImportResponseDto> {
    const intents: IntentModel[] = [];
    templateFile.forEach((t) => {
      // Si la connaissance a un id, une question principale et qu'elle n'est pas déjà présente dans la liste à sauvegarder alors on l'ajoute
      // La question principale est optionnelle pour les 'excluded_ids' qui sont des connaissances qui n'en ont pas forcément besoin
      if (
        t.id &&
        (t.main_question || AppConstants.General.excluded_Ids.includes(t.id)) &&
        !intents.find((i) => i.id === t.id)
      ) {
        intents.push({
          id: t.id,
          category: t.category,
          main_question: t.main_question,
          status: IntentStatus.active,
          expires_at: t.expires_at ? t.expires_at.toDate() : null,
          hidden: false,
        });
      }
    });
    // Sauvegarde des connaissances
    const intentsSaved: Intent[] = await this.intentService.saveMany(
      plainToInstance(IntentModel, snakecaseKeys(intents)),
    );

    // Mise en forme des réponses et des questions similaires
    const knowledges: Knowledge[] = [];
    const responses: Response[] = [];
    templateFile.forEach((t) => {
      if (t.id && t.questions && intentsSaved.find((i) => i.id === t.id)) {
        t.questions.forEach((q) => {
          knowledges.push({
            id: null,
            question: q,
            intent: intentsSaved.find((i) => i.id === t.id),
          });
        });
      }

      if (
        t.id &&
        t.response_type &&
        t.response &&
        intentsSaved.find((i) => i.id === t.id)
      ) {
        responses.push({
          id: null,
          intent: intentsSaved.find((i) => i.id === t.id),
          response_type: t.response_type,
          // Option pour changer l'URL dans les réponses (dans le cas d'un export d'un serveur à un autre par exemple)
          response:
            !!importFileDto.oldURL && !!importFileDto.newURL
              ? this.changeURL(t.response, importFileDto)
              : t.response,
        });
      }
    });

    // Option pour reset les connaissances lors de l'import d'un fichier
    if (importFileDto.deleteIntents) {
      await Promise.all([
        this.intentService.updateManyByCondition(
          {
            id: Not(
              In([
                ...intentsSaved.map((i) => i.id),
                ...AppConstants.General.excluded_Ids,
              ]),
            ),
          },
          { status: IntentStatus.to_archive },
        ),
        this.knowledgeService.deleteAll(),
        this.responseService.deleteAll(),
      ]);
    }
    // Suppressions des anciennes questions similaires puis sauvegarde des nouvelles questions similaires
    await this.knowledgeService.deleteByIntents(intentsSaved);
    const knowledgesSaved = await this.knowledgeService.findOrSave(knowledges);

    // Suppressions des anciennes réponses puis sauvegarde des nouvelles réponses
    await this.responseService.deleteByIntents(intentsSaved);
    const responsesSaved = await this.responseService.saveMany(responses);
    await this.intentService.updateManyByCondition(
      { id: In([...intents.map((i) => i.id)]) },
      { status: IntentStatus.to_deploy },
    );

    // Objet de retour avec le récapitualtif de ce qui a été sauvegardé
    const response = new ImportResponseDto();
    response.intents = intentsSaved.length;
    response.knowledges = knowledgesSaved.length;
    response.responses = responsesSaved.length;
    return response;
  }

  /**
   * Génération d'un object Workbook content une feuille de données
   * @private
   */
  private async generateWorkbook(): Promise<WorkBook> {
    const workbook = XLSX.utils.book_new();
    const worksheet_data = await this.generateWorksheet();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
    this.setPropertiesOnXls(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet);
    return workbook;
  }

  /**
   * Génération de la feuille de données avec les connaissances
   * @private
   */
  private async generateWorksheet() {
    const intents = await this.intentService
      .getRepository()
      .createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'response')
      .leftJoinAndSelect('intent.knowledges', 'knowledge')
      .where('intent.status IN (:...status)', {
        status: [
          IntentStatus.to_deploy,
          IntentStatus.active,
          IntentStatus.in_training,
          IntentStatus.active_modified,
        ],
      })
      .orderBy({
        'intent.updated_at': 'DESC',
        'intent.main_question': 'ASC',
        'response.id': 'ASC',
      })
      .getMany();
    let idx = 1;
    const rows = [
      [
        'ID',
        'Catégorie',
        'Question',
        'Type de réponse',
        'Réponse(s)',
        '',
        'Questions synonymes (à séparer par un point-virgule ;)',
        'Expire le (DD/MM/YYYY)',
        'Date de dernière mise à jour',
      ],
    ];
    intents.forEach((intent: Intent) => {
      intent.responses.forEach((r, idxResponse) => {
        idx += 1;
        rows.push(this.generateRow(intent, idx, idxResponse));
      });
    });
    return rows;
  }

  /**
   * Propriétés de la feuille de données
   * En l'occurence seulement la largeur des cellules
   * @param worksheet
   * @private
   */
  private setPropertiesOnXls(worksheet: WorkSheet) {
    worksheet['!cols'] = [
      { width: 18 },
      { width: 18 },
      { width: 53 },
      { width: 18 },
      { width: 75 },
      { width: 3 },
      { width: 75 },
    ];
  }

  /**
   * Génération d'une ligne pour la feuille de données des connaissances
   * @param intent
   * @param idx
   * @param idxResponse
   * @private
   */
  private generateRow(intent: Intent, idx: number, idxResponse: number) {
    return [
      intent.id,
      intent.category && idxResponse === 0 ? intent.category : '',
      intent.main_question && idxResponse === 0 ? intent.main_question : '',
      ResponseType_Fr[intent.responses[idxResponse]?.response_type],
      intent.responses[idxResponse]?.response,
      '',
      intent.knowledges && idxResponse === 0
        ? intent.knowledges?.map((k) => k.question).join('; ')
        : '',
      intent.expires_at ? moment(intent.expires_at).format('DD/MM/YYYY') : '',
      intent.updated_at
        ? moment(intent.updated_at).format('DD/MM/YYYY HH:mm:ss')
        : '',
    ];
  }

  /**
   * Option de changement d'URL
   * @param string
   * @param importFileDto
   * @private
   */
  private changeURL(string: string, importFileDto: ImportFileDto): string {
    const newUrl =
      importFileDto.newURL.slice(-1) === '/'
        ? importFileDto.newURL.slice(0, -1)
        : importFileDto.newURL;
    const regex = new RegExp(
      `https?:\/\/${importFileDto.oldURL}[^#?\\/]?`,
      'gm',
    );
    return string.replace(regex, newUrl);
  }

  /** ********************************************************************************** STATIC *********************************************************************************** */

  /**
   * Vérification du fichier d'import qui doit être au format xls ou xlsx
   * @param req
   * @param file
   * @param callback
   */
  static excelFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(xls|xlsx)$/)) {
      return callback(
        new HttpException(
          'Seul les fichiers en .xls et .xlsx sont acceptés.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
    return callback(null, true);
  };
}
