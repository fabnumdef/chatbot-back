import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TemplateFileCheckResumeDto } from "@core/dto/template-file-check-resume.dto";
import { Sheet2JSONOpts, WorkBook, WorkSheet } from "xlsx";
import { TemplateFileDto } from "@core/dto/template-file.dto";
import { ImportFileDto } from "@core/dto/import-file.dto";
import { IntentService } from "../intent/intent.service";
import { IntentModel } from "@core/models/intent.model";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { Intent } from "@core/entities/intent.entity";
import { Knowledge } from "@core/entities/knowledge.entity";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { plainToInstance } from "class-transformer";
import { Response } from "@core/entities/response.entity";
import { ResponseService } from "../response/response.service";
import { ResponseType, ResponseType_Fr, ResponseType_ReverseFr } from "@core/enums/response-type.enum";
import { ImportResponseDto } from "@core/dto/import-response.dto";
import * as fs from "fs";
import { In, Not, Repository } from "typeorm";
import * as path from "path";
import { InjectRepository } from "@nestjs/typeorm";
import { FileHistoric } from "@core/entities/file.entity";
import { mkdirp } from 'mkdirp';
import snakecaseKeys = require("snakecase-keys");
import { Cron, CronExpression } from "@nestjs/schedule";
import * as moment from 'moment';
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { AppConstants } from "@core/constant";
import { BotLogger } from "../logger/bot.logger";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

const XLSX = require('xlsx');
const uuid = require('uuid');

@Injectable()
export class FileService {
  private _xlsx = XLSX;
  private _historicDir = path.resolve(__dirname, '../../historic');
  private readonly _logger = new BotLogger('FileService');

  constructor(private readonly _intentService: IntentService,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _responseService: ResponseService,
              private readonly _configService: ChatbotConfigService,
              @InjectRepository(FileHistoric)
              private readonly _fileHistoricRepository: Repository<FileHistoric>) {
    // Création du dossier s'il n'existe pas
    mkdirp(this._historicDir).then();
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
      workbook = this._xlsx.read(file.buffer);
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      templateFile = this._convertExcelToJson(worksheet);
    } catch (error) {
      this._logger.error('Erreur lors de la lecture du fichier', error);
      throw new HttpException('Le fichier fournit ne peut pas être lu.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const templateFileCheckResume = new TemplateFileCheckResumeDto();
    this._computeTemplateFile(templateFile, templateFileCheckResume);
    this._checkFile(templateFile, templateFileCheckResume);

    return templateFileCheckResume;
  }

  /**
   * Import d'un fichier Excel
   * @param file
   * @param importFileDto
   */
  async importFile(file: any, importFileDto: ImportFileDto): Promise<ImportResponseDto> {
    const workbook: WorkBook = XLSX.read(file.buffer);
    const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
    const templateFile: TemplateFileDto[] = this._convertExcelToJson(worksheet);
    try {
      this._logger.log('Importing File');
      await this._configService.update(<ChatbotConfig>{is_blocked: true});
      const toReturn = await this._templateFileToDb(templateFile, importFileDto);
      await this._configService.update(<ChatbotConfig>{is_blocked: false});
      this._logger.log('Finishing importing File');
      return toReturn;
    } catch (e) {
      await this._configService.update(<ChatbotConfig>{is_blocked: false});
    }

  }

  /**
   * Export des connaissances dans un fichier Excel
   */
  exportXls(): Promise<fs.ReadStream> {
    return new Promise<fs.ReadStream>(async (resolve, reject) => {
      const workbook = await this._generateWorkbook();

      const guidForClient = uuid.v1();
      let pathNameWithGuid = `${guidForClient}_result.xlsx`;
      XLSX.writeFile(workbook, pathNameWithGuid);
      let stream = fs.createReadStream(pathNameWithGuid);
      stream.on("close", () => {
        fs.unlink(pathNameWithGuid, (error) => {
          if (error) {
            throw error;
          }
        });
      });
      resolve(stream);
      return;
    });
  }

  /**
   * Sauvegarde des connaissances dans un fichier Excel s'il y a eu un entraînement de l'IA dans la journée
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async storeHistoricFile() {
    const botConfig = await this._configService.getChatbotConfig();
    if (botConfig.last_training_at && moment().diff(moment(botConfig.last_training_at), 'hours') > 24) {
      return;
    }
    this._logger.log('Storing historic file');
    const workbook = await this._generateWorkbook();

    const timestamp = Date.now();
    let pathNameWithGuid = `base_connaissance-${timestamp}.xlsx`;
    XLSX.writeFile(workbook, path.resolve(this._historicDir, pathNameWithGuid));

    await this._fileHistoricRepository.save({name: pathNameWithGuid});
    this._logger.log('Finish storing historic file');
  }

  /**
   * Récupération de toutes les sauvegardes des connaissances
   */
  async findAll() {
    return this._fileHistoricRepository.find();
  }

  /************************************************************************************ PRIVATE FUNCTIONS ************************************************************************************/

  /**
   * Converti une feuille excel en entrée vers un tableau d'objets TemplateFileDto
   * @param worksheet
   */
  private _convertExcelToJson(worksheet: WorkSheet): TemplateFileDto[] {

    const headers = {
      'ID': 'id',
      'Catégorie': 'category',
      'Question': 'main_question',
      'Type de réponse': 'response_type',
      'Réponse(s)': 'response',
      'Questions synonymes (à séparer par un point-virgule ;)': 'questions',
      'Expire le (DD/MM/YYYY)': 'expires_at'
    };
    const options: Sheet2JSONOpts = {};
    // Converti le fichier excel en JSON brut
    const excelJson = this._xlsx.utils.sheet_to_json(worksheet, options);
    return excelJson.map((t: TemplateFileDto, idx: number) => {
      // On filtre les données utiles, si la colonne n'est pas utile, on la supprime
      for (let key of Object.keys(t)) {
        if (!!headers[key]) {
          t[headers[key]] = t[key];
        }
        delete t[key];
      }
      // On enlève les caractères unicode des ids ainsi que les espaces qu'on remplace par un _
      t.id = t.id?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W/g, '_');
      if (!t.id) {
        t.id = excelJson[idx - 1].id;
      }
      t.category = t.category?.trim();
      t.main_question = t.main_question?.trim();
      // Base de questions similaires servant à entraîner l'IA, elles sont séparées par des points virgule
      t.questions = t.questions ? (<any>t.questions).split(';').map(q => q.trim()).filter(q => !!q) : [];
      t.response_type = ResponseType[ResponseType_ReverseFr[t.response_type?.trim()]];
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
  private _checkFile(templateFile: TemplateFileDto[], templateFileCheckResume?: TemplateFileCheckResumeDto): void | boolean {
    templateFile.forEach((excelRow: TemplateFileDto, index: number) => {
      const excelIndex = index + 2;
      // Erreurs
      if (!excelRow.id) {
        this._addMessage(templateFileCheckResume.errors, excelIndex, `L'ID n'est pas renseigné.`);
      }
      if (excelRow.response && !excelRow.response_type) {
        this._addMessage(templateFileCheckResume.errors, excelIndex, `Le type de réponse n'est pas renseigné.`);
      }
      if (!excelRow.response && excelRow.response_type) {
        this._addMessage(templateFileCheckResume.errors, excelIndex, `La réponse n'est pas renseignée.`);
      }
      if (!excelRow.response && !excelRow.response_type) {
        this._addMessage(templateFileCheckResume.errors, excelIndex, `La réponse et le type de réponse n'est pas renseigné.`);
      }
      if ([ResponseType.quick_reply, ResponseType.image, ResponseType.button].includes(excelRow.response_type)
        && ((templateFile[index - 1]?.response_type !== ResponseType.text) || (templateFile[index - 1]?.id !== excelRow.id))) {
        this._addMessage(templateFileCheckResume.errors, excelIndex, `Ce type de réponse nécessite d'être précédée d'une réponse de type texte.`);
      }
      // S'il y a une question principale, il est censé y avoir une réponse, une catégorie etc ...
      if (excelRow.main_question) {
        // Avertissements (non bloquant)
        if (!excelRow.category) {
          this._addMessage(templateFileCheckResume.warnings, excelIndex, `La catégorie n'est pas renseignée.`);
        }
        if (excelRow.questions.length < 1) {
          this._addMessage(templateFileCheckResume.warnings, excelIndex, `Aucune question synonyme n'a été renseignée, le chatbot aura du mal à reconnaitre cette demande.`);
        }
        // S'il n'y a pas de question principale, c'est censé être une suite de réponse (et donc avoir une question principale reliée ou un lien vers cet id)
      } else {
        const excludedIds = AppConstants.General.excluded_Ids;
        const mainQuestion = templateFile.find(t =>
          (t.id === excelRow.id && !!t.main_question) || (t.response && t.response.includes(`<${excelRow.id}>`))
        );
        if (!mainQuestion && !excludedIds.includes(excelRow.id)) {
          this._addMessage(templateFileCheckResume.errors, excelIndex, `Aucune question n'est renseignée pour cet identifiant.`);
        }
      }
    });
  }

  /**
   * Extrait des premières stats du fichier excel vers le TemplateFileCheckResumeDto
   * @param templateFile
   * @param templateFileCheckResume
   */
  private _computeTemplateFile(templateFile: TemplateFileDto[], templateFileCheckResume: TemplateFileCheckResumeDto): void {
    templateFileCheckResume.categories = Array.from(new Set(templateFile.map(t => t.category))).filter(v => !!v);
    templateFileCheckResume.questionsNumber = templateFile.filter(t => !!t.main_question).length;
  }

  /**
   * Rajout d'un message à un objet clef / valeur
   * Rajoute la clef (numéro de l'index) si elle n'existe pas
   * @param keyValueObject
   * @param index
   * @param message
   */
  private _addMessage(keyValueObject: { [key: string]: string }, index: number, message: string) {
    if (!keyValueObject[index]) {
      keyValueObject[index] = '';
    }
    keyValueObject[index] += !!keyValueObject[index] ? `\n` : '';
    keyValueObject[index] += message;
  }

  /**
   * Mise en forme des données avant la sauvegarde dans la BDD
   * @param templateFile
   * @param importFileDto
   * @private
   */
  private async _templateFileToDb(templateFile: TemplateFileDto[], importFileDto: ImportFileDto): Promise<ImportResponseDto> {
    const intents: IntentModel[] = [];
    templateFile.forEach(t => {
      // Si la connaissance a un id, une question principale et qu'elle n'est pas déjà présente dans la liste à sauvegarder alors on l'ajoute
      // La question principale est optionnelle pour les 'excluded_ids' qui sont des connaissances qui n'en ont pas forcément besoin
      if (t.id
        && (t.main_question || AppConstants.General.excluded_Ids.includes(t.id))
        && !intents.find(i => i.id === t.id)) {
        intents.push({
          id: t.id,
          category: t.category,
          main_question: t.main_question,
          status: IntentStatus.active,
          expires_at: t.expires_at ? t.expires_at.toDate() : null,
          hidden: false
        });
      }
    });
    // Sauvegarde des connaissances
    const intentsSaved: Intent[] = await this._intentService.saveMany(plainToInstance(IntentModel, snakecaseKeys(intents)));

    // Mise en forme des réponses et des questions similaires
    const knowledges: Knowledge[] = [];
    const responses: Response[] = [];
    templateFile.forEach(t => {
      if (t.id && t.questions && intentsSaved.find(i => i.id === t.id)) {
        t.questions.forEach(q => {
          knowledges.push({
            id: null,
            question: q,
            intent: intentsSaved.find(i => i.id === t.id)
          })
        });
      }

      if (t.id && t.response_type && t.response && intentsSaved.find(i => i.id === t.id)) {
        responses.push({
          id: null,
          intent: intentsSaved.find(i => i.id === t.id),
          response_type: t.response_type,
          // Option pour changer l'URL dans les réponses (dans le cas d'un export d'un serveur à un autre par exemple)
          response: !!importFileDto.oldURL && !!importFileDto.newURL ? this._changeURL(t.response, importFileDto) : t.response
        })
      }
    });
    // Sauvegarde des questions similaires
    const knowledgesSaved = await this._knowledgeService.findOrSave(knowledges);

    // Suppressions des anciennes réponses puis sauvegarde des nouvelles réponses
    await this._responseService.deleteByIntents(intentsSaved);
    const responsesSaved = await this._responseService.saveMany(responses);

    // Option pour supprimer les anciennes connaissances lors de l'import d'un fichier
    if (importFileDto.deleteIntents) {
      await this._intentService.updateManyByCondition({id: Not(In([...intentsSaved.map(i => i.id), ...AppConstants.General.excluded_Ids]))},
        {status: IntentStatus.to_archive});
    }
    await this._intentService.updateManyByCondition({id: In([...intents.map(i => i.id)])},
      {status: IntentStatus.to_deploy});

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
  private async _generateWorkbook(): Promise<WorkBook> {
    const workbook = XLSX.utils.book_new();
    const worksheet_data = await this._generateWorksheet();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
    this._setPropertiesOnXls(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet);
    return workbook;
  }

  /**
   * Génération de la feuille de données avec les connaissances
   * @private
   */
  private async _generateWorksheet() {
    const intents = await this._intentService.getRepository()
      .createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'response')
      .leftJoinAndSelect('intent.knowledges', 'knowledge')
      .where('intent.status IN (:...status)', {status: [IntentStatus.to_deploy, IntentStatus.active, IntentStatus.in_training, IntentStatus.active_modified]})
      .orderBy({
        'intent.updated_at': 'DESC',
        'intent.main_question': 'ASC',
        'response.id': 'ASC'
      })
      .getMany();
    let idx = 1;
    const rows = [['ID', 'Catégorie', 'Question', 'Type de réponse', 'Réponse(s)', '', 'Questions synonymes (à séparer par un point-virgule ;)', 'Expire le (DD/MM/YYYY)', 'Date de dernière mise à jour']];
    intents.forEach((intent: Intent) => {
      intent.responses.forEach((r, idxResponse) => {
        idx += 1;
        rows.push(this._generateRow(intent, idx, idxResponse));
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
  private _setPropertiesOnXls(worksheet: WorkSheet) {
    worksheet['!cols'] = [
      {width: 18},
      {width: 18},
      {width: 53},
      {width: 18},
      {width: 75},
      {width: 3},
      {width: 75}
    ]
  }

  /**
   * Génération d'une ligne pour la feuille de données des connaissances
   * @param intent
   * @param idx
   * @param idxResponse
   * @private
   */
  private _generateRow(intent: Intent, idx: number, idxResponse: number) {
    return [
      intent.id,
      intent.category && idxResponse === 0 ? intent.category : '',
      intent.main_question && idxResponse === 0 ? intent.main_question : '',
      ResponseType_Fr[intent.responses[idxResponse]?.response_type],
      intent.responses[idxResponse]?.response,
      '',
      intent.knowledges && idxResponse === 0 ? intent.knowledges?.map(k => k.question).join('; ') : '',
      intent.expires_at ? moment(intent.expires_at).format('DD/MM/YYYY') : '',
      intent.updated_at ? moment(intent.updated_at).format('DD/MM/YYYY HH:mm:ss') : ''
    ]
  }

  /**
   * Option de changement d'URL
   * @param string
   * @param importFileDto
   * @private
   */
  private _changeURL(string: string, importFileDto: ImportFileDto): string {
    const newUrl = importFileDto.newURL.slice(-1) === '/' ? importFileDto.newURL.slice(0, -1) : importFileDto.newURL;
    const regex = new RegExp(`https?:\/\/${importFileDto.oldURL}[^#?\\/]?`, 'gm');
    return string.replace(regex, newUrl);
  }


  /************************************************************************************ STATIC ************************************************************************************/

  /**
   * Vérification du fichier d'import qui doit être au format xls ou xlsx
   * @param req
   * @param file
   * @param callback
   */
  static excelFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(xls|xlsx)$/)) {
      return callback(new HttpException('Seul les fichiers en .xls et .xlsx sont acceptés.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };
}
