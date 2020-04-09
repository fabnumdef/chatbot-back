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
import { plainToClass } from "class-transformer";
import { Response } from "@core/entities/response.entity";
import { ResponseService } from "../response/response.service";
import { ResponseType, ResponseType_Fr, ResponseType_ReverseFr } from "@core/enums/response-type.enum";
import snakecaseKeys = require("snakecase-keys");
import { ImportResponseDto } from "@core/dto/import-response.dto";
import * as fs from "fs";
import { In, Not } from "typeorm";

const XLSX = require('xlsx');
const uuid = require('uuid');

@Injectable()
export class FileService {
  private _xlsx = XLSX;

  constructor(private readonly _intentService: IntentService,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _responseService: ResponseService) {
  }

  checkFile(file): TemplateFileCheckResumeDto {
    let workbook: WorkBook;
    let worksheet: WorkSheet;
    let templateFile: TemplateFileDto[];
    try {
      workbook = this._xlsx.read(file.buffer);
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      templateFile = this._convertExcelToJson(worksheet);
    } catch (error) {
      throw new HttpException('Le fichier fournit ne peut pas être lu.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const templateFileCheckResume = new TemplateFileCheckResumeDto();
    this._computeTemplateFile(templateFile, templateFileCheckResume);
    this._checkFile(templateFile, templateFileCheckResume);

    return templateFileCheckResume;
  }

  async importFile(file: any, importFileDto: ImportFileDto): Promise<ImportResponseDto> {
    const workbook: WorkBook = XLSX.read(file.buffer);
    const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
    const templateFile: TemplateFileDto[] = this._convertExcelToJson(worksheet);
    return await this._templateFileToDb(templateFile, importFileDto.deleteIntents);
  }

  exportXls(): Promise<fs.ReadStream> {
    return new Promise<fs.ReadStream>(async (resolve, reject) => {
      const workbook = XLSX.utils.book_new();
      const worksheet_data = await this._generateXls();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
      this._setPropertiesOnXls(worksheet);
      XLSX.utils.book_append_sheet(workbook, worksheet);

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

  /************************************************************************************ PRIVATE FUNCTIONS ************************************************************************************/

  /**
   * Converti une feuille excel en entrée vers un tableau d'objets TemplateFileDto
   * @param worksheet
   */
  private _convertExcelToJson(worksheet: WorkSheet): TemplateFileDto[] {
    const options: Sheet2JSONOpts = {
      header: ['id', 'category', 'main_question', 'response_type', 'response', '', 'questions'],
      range: 1
    };
    return this._xlsx.utils.sheet_to_json(worksheet, options).map((t: TemplateFileDto) => {
      t.id = t.id.trim();
      t.category = t.category?.trim();
      t.main_question = t.main_question?.trim();
      t.questions = t.questions ? (<any>t.questions).split(';').map(q => q.trim()) : [];
      t.response_type = ResponseType[ResponseType_ReverseFr[t.response_type]];
      return t;
    });
  }

  /**
   * Parcours du fichier excel et vérification que tout les éléments sont présents
   * @param templateFile
   * @param templateFileCheckResume
   */
  private _checkFile(templateFile: TemplateFileDto[], templateFileCheckResume?: TemplateFileCheckResumeDto): void | boolean {
    templateFile.forEach((excelRow: TemplateFileDto, index: number) => {
      const excelIndex = index + 2;
      // ERRORS
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
      // Si il y a une question principale il est censé y avoir une réponse, une catégorie etc ...
      if (!!excelRow.main_question) {
        // WARNINGS
        if (!excelRow.category) {
          this._addMessage(templateFileCheckResume.warnings, excelIndex, `La catégorie n'est pas renseignée.`);
        }
        if (excelRow.questions.length < 1) {
          this._addMessage(templateFileCheckResume.warnings, excelIndex, `Aucune question synonyme n'a été renseignée, le chatbot aura du mal à reconnaitre cette demande.`);
        }
        // Si il n'y a pas de question principale, c'est censé être une suite de réponse (et donc avoir une question principale relié ou un lien vers cet id)
      } else {
        const excludedIds = ['get_started', 'out_of_scope'];
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

  private async _templateFileToDb(templateFile: TemplateFileDto[], deleteIntents: boolean): Promise<ImportResponseDto> {
    // Save intents
    const intents: IntentModel[] = [];
    templateFile.forEach(t => {
      if (t.id
        && (t.main_question || ['get_started', 'out_of_scope'].includes(t.id))
        && !intents.find(i => i.id === t.id)) {
        intents.push({
          id: t.id,
          category: t.category,
          main_question: t.main_question,
          status: IntentStatus.active
        });
      }
    });
    const intentsSaved: Intent[] = await this._intentService.saveMany(plainToClass(IntentModel, snakecaseKeys(intents)));

    if(deleteIntents) {
      this._intentService.updateManyByCondition({id: Not(In(intentsSaved.map(i => i.id)))}, {status: IntentStatus.archived});
    }

    // Save Knowledge
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
          response: t.response
        })
      }
    });
    const knowledgesSaved = await this._knowledgeService.findOrSave(knowledges);

    // Save responses
    await Promise.all(intentsSaved.map(i => this._responseService.deleteByIntent(i)));
    const responsesSaved = await this._responseService.saveMany(responses);

    const response = new ImportResponseDto();
    response.intents = intentsSaved.length;
    response.knowledges = knowledgesSaved.length;
    response.responses = responsesSaved.length;
    return response;
  }

  private async _generateXls() {
    const intents = await this._intentService.getRepository()
      .createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'response')
      .leftJoinAndSelect('intent.knowledges', 'knowledge')
      .where('intent.status = :status', {status: IntentStatus.active})
      .orderBy({
        'intent.id': 'ASC',
        'response.id': 'ASC'
      })
      .getMany();
    let idx = 1;
    const rows = [['ID', 'Catégorie', 'Question', 'Type de réponse', 'Réponse(s)', '', 'Questions synonymes (à séparer par un point-virgule ;)']];
    intents.forEach((intent: Intent) => {
      intent.responses.forEach((r, idxResponse) => {
        idx += 1;
        rows.push(this._generateRow(intent, idx, idxResponse));
      });
    });
    return rows;
  }

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
   * Generate row for a worksheet
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
      intent.knowledges && idxResponse === 0 ? intent.knowledges?.map(k => k.question).join('; ') : ''
    ]
  }


  /************************************************************************************ STATIC ************************************************************************************/

  static excelFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(xls|xlsx)$/)) {
      return callback(new HttpException('Seul les fichiers en .xls et .xlsx sont acceptés.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };
}
