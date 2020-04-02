import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { IntentDto } from "@core/dto/intent.dto";

@Injectable()
export class IntentService {

  constructor(@InjectRepository(Intent)
              private readonly _intentsRepository: Repository<Intent>) {
  }

  findAll(): Promise<Intent[]> {
    return this._intentsRepository.find();
  }

  findOne(id: string): Promise<Intent> {
    return this._intentsRepository.findOne(id);
  }

  create(intent: IntentDto): Promise<Intent> {
    return this._intentsRepository.save(intent);
  }

  async remove(id: string): Promise<void> {
    await this._intentsRepository.delete(id);
  }
}
