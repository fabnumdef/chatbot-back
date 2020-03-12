import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../core/entity/user.entity";

@Injectable()
export class UserService {
  constructor(@InjectRepository(User)
              private readonly usersRepository: Repository<User>) {
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(email: string): Promise<User> {
    return this.usersRepository.findOne(email);
  }

  async remove(email: string): Promise<void> {
    await this.usersRepository.delete(email);
  }
}
