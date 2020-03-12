import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Knowledge } from "@core/entity/knowledge.entity";
import { KnowledgeDto } from "@core/dto/knowledge.dto";

@Injectable()
export class KnowledgeService {

  constructor(@InjectRepository(Knowledge)
              private readonly _knowledgesRepository: Repository<Knowledge>) {
  }

  findAll(): Promise<Knowledge[]> {
    return this._knowledgesRepository.find();
  }

  create(knowledge: KnowledgeDto): Promise<Knowledge> {
    return this._knowledgesRepository.save(knowledge);
  }

  async remove(id: string): Promise<void> {
    await this._knowledgesRepository.delete(id);
  }
}
