import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { KnowledgeDto } from "@core/dto/knowledge.dto";
import { IntentModel } from "@core/models/intent.model";
import { Intent } from "@core/entities/intent.entity";
import { KnowledgeModel } from "@core/models/knowledge.model";

@Injectable()
export class KnowledgeService {

  constructor(@InjectRepository(Knowledge)
              private readonly _knowledgesRepository: Repository<Knowledge>) {
  }

  findAll(): Promise<Knowledge[]> {
    return this._knowledgesRepository.find();
  }

  create(knowledge: KnowledgeModel): Promise<Knowledge> {
    return this._knowledgesRepository.save(knowledge);
  }

  async findOrSave(knowledges: Knowledge[]): Promise<Knowledge[]> {
    // On ne sait pas si le knowledge existe, pour éviter de faire péter la constraint unique
    const knowledgesEntity: Knowledge[] = [];
    await knowledges.forEach(async k => {
      const kEntity = await this._knowledgesRepository.findOne({intent: k.intent, question: k.question});
      if(!kEntity) {
        knowledgesEntity.push(await this._knowledgesRepository.save(k));
      } else {
        knowledgesEntity.push(kEntity);
      }
    });
    return knowledgesEntity;
  }

  async remove(id: string): Promise<void> {
    await this._knowledgesRepository.delete(id);
  }
}
