import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { IntentStatus } from "@core/enums/intent-status.enum";

@Injectable()
export class IntentService {

  constructor(@InjectRepository(Intent)
              private readonly _intentsRepository: Repository<Intent>) {
  }

  findAll(params: any = {status: IntentStatus.active}): Promise<Intent[]> {
    return this._intentsRepository.find(params);
  }

  findFullIntents(): Promise<Intent[]> {
    return this._intentsRepository.createQueryBuilder('intent')
      .leftJoinAndSelect('intent.responses', 'responses')
      .leftJoinAndSelect('intent.knowledges', 'knowledges')
      .where("intent.status IN (:...status)", {status: [IntentStatus.to_deploy, IntentStatus.active]})
      .orderBy({
        'intent.id': 'ASC',
        'knowledges.id': 'ASC',
        'responses.id': 'ASC'
      })
      .getMany();
  }

  findOne(id: string): Promise<Intent> {
    return this._intentsRepository.findOne(id);
  }

  create(intent: IntentModel): Promise<Intent> {
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
}
