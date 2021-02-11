import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "@core/entities/response.entity";
import { ResponseModel } from "@core/models/response.model";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";

@Injectable()
export class ResponseService {

  constructor(@InjectRepository(Response)
              private readonly _responsesRepository: Repository<Response>) {
  }

  findByIntent(intent: IntentModel): Promise<Response[]> {
    return this._responsesRepository.find({where: {'intent': intent}, order: {'id': 'ASC'}});
  }

  findAll(): Promise<Response[]> {
    return this._responsesRepository.find();
  }

  create(response: ResponseModel): Promise<Response> {
    return this._responsesRepository.save(response);
  }

  saveMany(responses: Response[]): Promise<Response[]> {
    return this._responsesRepository.save(responses);
  }

  async updateFileResponses(oldFile: string, newFile: string) {
    this._responsesRepository.createQueryBuilder('response')
      .update()
      .set({
        response: `REPLACE(response, '${oldFile}', '${newFile}')`
      })
      .where(`response LIKE '%${oldFile}%'`);
  }

  async updateIntentResponses(oldIntentId: string, newIntentId: string) {
    this._responsesRepository.createQueryBuilder('response')
      .update()
      .set({
        response: `REPLACE(response, '${oldIntentId}', '${newIntentId}')`
      })
      .where(`response LIKE '%<${oldIntentId}>%'`);
  }

  async deleteByIntent(intent: Intent): Promise<void> {
    await this._responsesRepository.delete({
      intent: intent
    });
  }

  async remove(id: string): Promise<void> {
    await this._responsesRepository.delete(id);
  }}
