import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Knowledge } from '@core/entities/knowledge.entity'
import { type KnowledgeModel } from '@core/models/knowledge.model'
import { type IntentModel } from '@core/models/intent.model'

@Injectable()
export default class KnowledgeService {
  constructor (
    @InjectRepository(Knowledge)
    private readonly knowledgesRepository: Repository<Knowledge>
  ) {}

  /**
   * Retourne les questions similaires d'une connaissance
   * @param intent
   */
  async findByIntent (intent: IntentModel): Promise<Knowledge[]> {
    return this.knowledgesRepository.find({
      where: { intent: { id: intent.id } },
      order: { id: 'ASC' }
    })
  }

  // /**
  //  * Retourne toutes les questions similaires
  //  */
  // findAll(): Promise<Knowledge[]> {
  //   return this.knowledgesRepository.find();
  // }

  /**
   * Création d'une question similaire
   * @param knowledge
   */
  async create (knowledge: KnowledgeModel): Promise<Knowledge> {
    return this.knowledgesRepository.save(knowledge)
  }

  /**
   * Vérification avant création d'une question similaire
   * Si celle-ci existe déjà, on ne la sauvegarde pas
   * @param knowledge
   */
  async createSafe (knowledge: Knowledge): Promise<Knowledge> {
    const query = this.knowledgesRepository
      .createQueryBuilder('knowledge')
      .select()
      .where({
        intent: knowledge.intent,
        question: knowledge.question
      })
    if (!(await query.getOne())) {
      return this.knowledgesRepository.save(knowledge)
    }
    return knowledge
  }

  /**
   * Sauvegarde sécurisée de plusieurs questions similaires
   * @param knowledges
   */
  async findOrSave (knowledges: Knowledge[]): Promise<Knowledge[]> {
    // On récupère tout les knowledges possibles
    const knowledgesExisting = await this.knowledgesRepository
      .createQueryBuilder('knowledge')
      .select()
      .leftJoinAndSelect('knowledge.intent', 'intent')
      .where({
        intent: In(knowledges.map((k) => k.intent).map((i) => i.id))
      })
      .getMany()
    const knowledgesToSave = []
    knowledges.forEach((k) => {
      if (
        knowledgesExisting.findIndex(
          (ke) => ke.intent.id === k.intent.id && ke.question === k.question
        ) < 0
      ) {
        knowledgesToSave.push(k)
      }
    })
    // On ne sait pas si le knowledge existe, pour éviter de faire péter la constraint unique
    let knowledgesEntity: Knowledge[] = []
    const promises = []
    await knowledgesToSave.forEach((k) => {
      promises.push(this.create(k))
    })
    knowledgesEntity = await Promise.all(promises)
    return knowledgesEntity
  }

  /**
   * Suppression d'une question similaire
   * @param id
   */
  async remove (id: string): Promise<void> {
    await this.knowledgesRepository.delete(id)
  }

  resetData () {
    this.knowledgesRepository.createQueryBuilder().delete().execute(); 
  }
}
