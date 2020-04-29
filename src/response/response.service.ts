import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "@core/entities/response.entity";
import { ResponseDto } from "@core/dto/response.dto";
import { Knowledge } from "@core/entities/knowledge.entity";
import { ResponseModule } from "./response.module";
import { ResponseModel } from "@core/models/response.model";
import { IntentModel } from "@core/models/intent.model";
import { Intent } from "@core/entities/intent.entity";

@Injectable()
export class ResponseService {

  constructor(@InjectRepository(Response)
              private readonly _responsesRepository: Repository<Response>) {
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

  async deleteByIntent(intent: Intent): Promise<void> {
    await this._responsesRepository.delete({
      intent: intent
    });
  }

  async remove(id: string): Promise<void> {
    await this._responsesRepository.delete(id);
  }}
