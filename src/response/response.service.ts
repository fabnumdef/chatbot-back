import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "@core/entities/response.entity";
import { ResponseDto } from "@core/dto/response.dto";

@Injectable()
export class ResponseService {

  constructor(@InjectRepository(Response)
              private readonly _responsesRepository: Repository<Response>) {
  }

  findAll(): Promise<Response[]> {
    return this._responsesRepository.find();
  }

  create(response: ResponseDto): Promise<Response> {
    return this._responsesRepository.save(response);
  }

  async remove(id: string): Promise<void> {
    await this._responsesRepository.delete(id);
  }}
