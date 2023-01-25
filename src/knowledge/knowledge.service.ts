import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { KnowledgeModel } from "@core/models/knowledge.model";
import { IntentModel } from "@core/models/intent.model";

@Injectable()
export class KnowledgeService {

  constructor(@InjectRepository(Knowledge)
              private readonly _knowledgesRepository: Repository<Knowledge>) {
  }

  /**
   * Retourne les questions similaires d'une connaissance
   * @param intent
   */
  async findByIntent(intent: IntentModel): Promise<Knowledge[]> {
    return this._knowledgesRepository.find({where: {intent: {id: intent.id}}, order: {id: 'ASC'}});
  }

  // /**
  //  * Retourne toutes les questions similaires
  //  */
  // findAll(): Promise<Knowledge[]> {
  //   return this._knowledgesRepository.find();
  // }

  /**
   * Création d'une question similaire
   * @param knowledge
   */
  create(knowledge: KnowledgeModel): Promise<Knowledge> {
    return this._knowledgesRepository.save(knowledge);
  }

  /**
   * Vérification avant création d'une question similaire
   * Si celle-ci existe déjà, on ne la sauvegarde pas
   * @param knowledge
   */
  async createSafe(knowledge: Knowledge): Promise<Knowledge> {
    const kEntity = await this._knowledgesRepository.findOne({
      where: {
        intent: knowledge.intent,
        question: knowledge.question
      }
    });
    if (!kEntity) {
      return this._knowledgesRepository.save(knowledge);
    }
    return knowledge;
  }

  /**
   * Sauvegarde sécurisée de plusieurs questions similaires
   * @param knowledges
   */
  async findOrSave(knowledges: Knowledge[]): Promise<Knowledge[]> {
    // On ne sait pas si le knowledge existe, pour éviter de faire péter la constraint unique
    const knowledgesEntity: Knowledge[] = [];
    await knowledges.forEach(async k => {
      knowledgesEntity.push(await this.createSafe(k));
    });
    return knowledgesEntity;
  }

  /**
   * Suppression d'une question similaire
   * @param id
   */
  async remove(id: string): Promise<void> {
    await this._knowledgesRepository.delete(id);
  }
}
