import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { KnowledgeModel } from "@core/models/knowledge.model";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";

@Injectable()
export class KnowledgeService {

  constructor(@InjectRepository(Knowledge)
              private readonly _knowledgesRepository: Repository<Knowledge>) {
  }

  findByIntent(intent: IntentModel): Promise<Knowledge[]> {
    return this._knowledgesRepository.find({where: {'intent': intent}, order: {'id': 'ASC'}});
  }

  findAll(): Promise<Knowledge[]> {
    return this._knowledgesRepository.find();
  }

  create(knowledge: KnowledgeModel): Promise<Knowledge> {
    return this._knowledgesRepository.save(knowledge);
  }

  async createSafe(knowledge: Knowledge): Promise<Knowledge> {
    const kEntity = await this._knowledgesRepository.findOne({intent: knowledge.intent, question: knowledge.question});
    if(!kEntity) {
      return this._knowledgesRepository.save(knowledge);
    }
    return knowledge;
  }

  async findOrSave(knowledges: Knowledge[]): Promise<Knowledge[]> {
    // On ne sait pas si le knowledge existe, pour éviter de faire péter la constraint unique
    const knowledgesEntity: Knowledge[] = [];
    await knowledges.forEach(async k => {
      knowledgesEntity.push(await this.createSafe(k));
    });
    return knowledgesEntity;
  }

  async remove(id: string): Promise<void> {
    await this._knowledgesRepository.delete(id);
  }
}
