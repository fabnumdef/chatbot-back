import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@core/entities/user.entity";
import { UserModel } from "@core/models/user.model";
import { UserRole } from "@core/enums/user-role.enum";
import { MailService } from "../shared/services/mail.service";
const bcrypt = require('bcrypt');
const crypto = require('crypto');

@Injectable()
export class UserService {
  constructor(@InjectRepository(User)
              private readonly _usersRepository: Repository<User>,
              private readonly _mailService: MailService) {
  }

  findAll(): Promise<User[]> {
    return this._usersRepository.find();
  }

  findOne(email: string, password: boolean = false): Promise<User> {
    if (!password) {
      return this._usersRepository.findOne({where: {email: email}});
    }
    return this._usersRepository.findOne({
      select: ['email', 'password', 'first_name', 'last_name', 'function', 'role', 'failed_login_attempts', 'lock_until'],
      where: {email: email}
    });
  }

  findOneWithParam(param: any): Promise<User> {
    return this._usersRepository.findOne(param);
  }

  async findAndUpdate(email: string, data: any): Promise<User> {
    const userExists = await this.findOne(email);
    if (!userExists) {
      throw new HttpException('Cet utilisateur n\'existe pas.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this._usersRepository.save({
      ...userExists,
      ...data
    });
  }

  async update(email: string, data: any): Promise<User> {
    await this._usersRepository.update({email: email}, data);
    return this.findOne(email);
  }

  async create(user: UserModel): Promise<UserModel> {
    const userExists = await this.findOne(user.email);
    if (!userExists) {
      const userCreated = await this._usersRepository.save(user);
      await this.sendEmailPasswordToken(userCreated);
      return userCreated;
    }
    throw new HttpException('Un utilisateur avec cet email existe déjà.', HttpStatus.FORBIDDEN);
  }

  async delete(email: string): Promise<void> {
    await this._usersRepository.delete(email);
  }

  async generateAdminUser(user: UserModel): Promise<UserModel> {
    const adminExists = await this.findOneWithParam({
      role: UserRole.admin
    });
    if(!!adminExists) {
      throw new HttpException('Un administrateur existe déjà.', HttpStatus.FORBIDDEN);
    }
    user.role = UserRole.admin;
    user.password = bcrypt.hashSync(user.password, 10);

    const userUpdated = await this._usersRepository.save(user);
    await this.sendEmailPasswordToken(userUpdated);
    return userUpdated;
  }

  async sendEmailPasswordToken(user: User) {
    const userUpdated = await this.setPasswordResetToken(user);
    await this._mailService.sendEmail(userUpdated.email,
      'Fabrique à Chatbots - Création de compte',
      'create-account',
      {  // Data to be sent to template engine.
        firstName: userUpdated.first_name,
        url: `${process.env.HOST_URL}/backoffice/auth/reset-password?token=${userUpdated.reset_password_token}`
      })
      .then(() => {
      });
  }

  async setPasswordResetToken(user: User) {
    // create the random token
    const tokenLength = 64;
    const token = crypto
      .randomBytes(Math.ceil((tokenLength * 3) / 4))
      .toString('base64') // convert to base64 format
      .slice(0, tokenLength) // return required number of characters
      .replace(/\+/g, '0') // replace '+' with '0'
      .replace(/\//g, '0'); // replace '/' with '0'

    const valuesToUpdate = {
      reset_password_token: token,
      reset_password_expires: new Date((Date.now() + 86400000))
    };
    return this.findAndUpdate(user.email, valuesToUpdate);
  }
}
