import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "@core/entities/response.entity";
import { ResponseModel } from "@core/models/response.model";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

@Injectable()
export class ResponseService {

  constructor(@InjectRepository(Response)
              private readonly _responsesRepository: Repository<Response>,
              @InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>) {
  }

  /**
   * Récupération des réponses par rapport à une connaissance passée en argument
   * @param intent
   */
  findByIntent(intent: IntentModel): Promise<Response[]> {
    return this._responsesRepository.find({where: {intent: {id: intent.id}}, order: {id: 'ASC'}});
  }

  /**
   * Récupération de toutes les réponses
   */
  findAll(): Promise<Response[]> {
    return this._responsesRepository.find();
  }

  /**
   * Création d'une réponse
   * @param response
   */
  create(response: ResponseModel): Promise<Response> {
    return this._responsesRepository.save(response);
  }

  /**
   * Edition d'une réponse
   * @param response
   */
  update(response: ResponseModel): Promise<UpdateResult> {
    return this._responsesRepository.update({id: response.id}, response);
  }

  /**
   * Sauvegarde de plusieurs réponses
   * @param responses
   */
  saveMany(responses: Response[]): Promise<Response[]> {
    return this._responsesRepository.save(responses);
  }

  /**
   * Remplacement d'une ancienne URL par une nouvelle URL dans toutes les réponses
   * @param oldFile
   * @param newFile
   */
  async updateFileResponses(oldFile: string, newFile: string) {
    const result = await this._responsesRepository.createQueryBuilder('response')
      .update()
      .set({
        response: () => `REPLACE(response, '${oldFile}', '${newFile}')`
      })
      .where(`response LIKE '%${oldFile}%'`).execute();
    if (result.affected && result.affected > 0) {
      await this._configRepository.update({id: 1}, {need_training: true});
    }
  }

  /**
   * Remplacement d'une ancienne connaissance par une nouvelle connaissance dans toutes les réponses
   * @param oldIntentId
   * @param newIntentId
   */
  async updateIntentResponses(oldIntentId: string, newIntentId: string) {
    await this._responsesRepository.createQueryBuilder('response')
      .update()
      .set({
        response: () => `REPLACE(response, '${oldIntentId}', '${newIntentId}')`
      })
      .where(`response LIKE '%<${oldIntentId}>%'`).execute();
  }

  /**
   * Suppression des réponses d'une connaissance passée en argument
   * @param intent
   */
  async deleteByIntent(intent: Intent): Promise<void> {
    await this._responsesRepository.delete({
      intent: intent
    });
  }

  /**
   * Suppression d'une réponse
   * @param id
   */
  async remove(id: string): Promise<void> {
    await this._responsesRepository.delete(id);
  }
}
