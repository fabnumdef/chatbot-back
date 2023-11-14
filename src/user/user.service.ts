import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import { User } from "@core/entities/user.entity";
import { MailService } from "../shared/services/mail.service";
import { UserModel } from "@core/models/user.model";
import { UserRole } from "@core/enums/user-role.enum";
import { getCols } from '@core/repository-utils';
const bcrypt = require('bcrypt');
const crypto = require('crypto');

@Injectable()
export class UserService {
  constructor(@InjectRepository(User)
  private readonly _usersRepository: Repository<User>,
    private readonly _mailService: MailService) {
  }

  /**
   * Récupération de tous les utilisateurs
   */
  findAll(): Promise<User[]> {
    return this._usersRepository.find({
      order: {
        disabled: 'ASC',
        first_name: 'ASC',
        last_name: 'ASC'
      }
    });
  }

  /**
   * Récupération d'un seul utilisateur
   * @param email
   * @param password
   */
  findOne(email: string, password = false): Promise<User> {
    if (!password) {
      return this._usersRepository.findOne({ where: { email: email } });
    }
    return this._usersRepository.findOne({
      select: getCols(this._usersRepository),
      where: { email: email }
    });
  }

  /**
   * Récupération d'un seul utilisateur avec une clause
   * @param param
   */
  findOneWithParam(param: FindOneOptions): Promise<User> {
    return this._usersRepository.findOne(param);
  }

  /**
   * Récupération d'un utilisateur et mise à jour de celui-ci
   * @param email
   * @param data
   */
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

  /**
   * Mise à jour d'un utilisateur
   * @param email
   * @param data
   */
  async update(email: string, data: any): Promise<User> {
    await this._usersRepository.update({ email: email }, data);
    return this.findOne(email);
  }

  /**
   * Création d'un utilisateur si le mail n'est pas déjà pris
   * @param user
   */
  async create(user: UserModel): Promise<UserModel> {
    const userExists = await this.findOne(user.email);
    if (!userExists) {
      const userCreated = await this._usersRepository.save(user);
      // Envoi d'un email de création de compte
      await this.sendEmailPasswordToken(userCreated);
      return userCreated;
    }
    throw new HttpException('Un utilisateur avec cet email existe déjà.', HttpStatus.FORBIDDEN);
  }

  /**
   * Désactivation d'un utilisateur
   * @param email
   */
  async delete(email: string): Promise<void> {
    await this._usersRepository.update({ email: email }, { disabled: true });
  }

  /**
   * Génération du premier utilisateur administrateur
   * @param user
   */
  async generateAdminUser(user: UserModel): Promise<UserModel> {
    const adminExists = await this.findOneWithParam({
      where: {
        role: UserRole.admin
      }
    });
    if (adminExists) {
      throw new HttpException('Un administrateur existe déjà.', HttpStatus.FORBIDDEN);
    }
    user.role = UserRole.admin;
    user.password = bcrypt.hashSync(user.password, 10);

    const userUpdated = await this._usersRepository.save(user);
    await this.sendEmailPasswordToken(userUpdated);
    return userUpdated;
  }

  /**
   * Envoi d'un email de création de compte avec le lien pour changer son mot de passe
   * @param user
   */
  async sendEmailPasswordToken(user: User) {
    const userUpdated = await this.setPasswordResetToken(user);
    await this._mailService.sendEmail(userUpdated.email,
      'Usine à Chatbots - Création de compte',
      'create-account',
      {  // Data to be sent to template engine.
        firstName: userUpdated.first_name,
        url: `${process.env.HOST_URL}/backoffice/auth/reset-password?token=${userUpdated.reset_password_token}`
      })
      .then(() => {
      });
  }

  /**
   * Mise à jour du token de reset de mot de passe, valable 24h
   * @param user
   */
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
