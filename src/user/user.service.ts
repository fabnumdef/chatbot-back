import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@core/entity/user.entity";

@Injectable()
export class UserService {
  constructor(@InjectRepository(User)
              private readonly _usersRepository: Repository<User>) {
  }

  findAll(): Promise<User[]> {
    return this._usersRepository.find();
  }

  async findOne(email: string): Promise<User> {
    return this._usersRepository.findOne(email);
  }

  async remove(email: string): Promise<void> {
    await this._usersRepository.delete(email);
  }
}
