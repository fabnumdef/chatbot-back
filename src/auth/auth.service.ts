import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "@core/dto/login-user.dto";
import { AuthResponseDto } from "@core/dto/auth-response.dto";
import { ResetPasswordDto } from "@core/dto/reset-password.dto";
import { MoreThan } from "typeorm";
import { MailService } from "../shared/services/mail.service";
import * as moment from 'moment';
import { User } from "@core/entities/user.entity";

const bcrypt = require('bcrypt');

@Injectable()
export class AuthService {
  private saltRounds = 10;
  private _failedLoginAttempts = 5;

  constructor(private readonly _userService: UserService,
              private readonly _jwtService: JwtService,
              private readonly _mailService: MailService) {
  }

  async login(user: LoginUserDto): Promise<AuthResponseDto> {
    const userToReturn = await this._validateUser(user);
    if (userToReturn) {
      return {
        chatbotToken: this._jwtService.sign(JSON.parse(JSON.stringify(userToReturn))),
        user: userToReturn
      };
    }
    return null;
  }

  async sendEmailPasswordToken(email: string) {
    const userWithoutPassword = await this._userService.findOne(email);
    if (!userWithoutPassword) {
      return;
    }
    const userUpdated = await this._userService.setPasswordResetToken(userWithoutPassword);

    await this._mailService.sendEmail(userUpdated.email,
      'Usine à Chatbots - Réinitialisation de mot de passe',
      'forgot-password',
      {  // Data to be sent to template engine.
        firstName: userUpdated.first_name,
        url: `${process.env.HOST_URL}/backoffice/auth/reset-password?token=${userUpdated.reset_password_token}`
      })
      .then(() => {
      });
  }

  async resetPassword(resetPassword: ResetPasswordDto) {
    const userWithoutPassword = await this._userService.findOneWithParam({
      reset_password_token: resetPassword.token,
      reset_password_expires: MoreThan(new Date())
    });
    if (!userWithoutPassword) {
      throw new HttpException('Cet utilisateur n\'existe pas.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const hashPassword = bcrypt.hashSync(resetPassword.password, this.saltRounds);
    const valuesToUpdate = {
      password: hashPassword,
      reset_password_token: undefined,
      reset_password_expires: undefined,
      lock_until: undefined,
      failed_login_attempts: 0
    };
    const userUpdated = await this._userService.findAndUpdate(userWithoutPassword.email, valuesToUpdate);

    await this._mailService.sendEmail(userUpdated.email,
      'Usine à Chatbots - Mot de passe modifié',
      'reset-password',
      {  // Data to be sent to template engine.
        firstName: userUpdated.first_name,
        url: `${process.env.HOST_URL}/backoffice/auth/login`
      })
      .then(() => {
      });
  }

  /**
   * PRIVATE FUNCTIONS
   */

  private async _validateUser(user: LoginUserDto): Promise<any> {
    const userToReturn = await this._userService.findOne(user.email, true);
    if (!!userToReturn && userToReturn.disabled) {
      throw new HttpException('Votre compte a été supprimé. Merci de prendre contact avec l\'administrateur si vous souhaitez réactiver votre compte.',
        HttpStatus.UNAUTHORIZED);
    }
    if (!!userToReturn && userToReturn.lock_until && moment.duration(moment(userToReturn.lock_until).add(1, 'd').diff(moment())).asHours() < 0) {
      await this._userService.findAndUpdate(userToReturn.email, {failed_login_attempts: 0, lock_until: null});
      userToReturn.lock_until = null;
      userToReturn.failed_login_attempts = 0;
    }
    if (!!userToReturn && !!userToReturn.password && bcrypt.compareSync(user.password, userToReturn.password) && userToReturn.failed_login_attempts < this._failedLoginAttempts) {
      const {password, ...result} = userToReturn;
      await this._userService.findAndUpdate(userToReturn.email, {failed_login_attempts: 0, lock_until: null})
      return result;
    }
    if (!!userToReturn && !!userToReturn.password && (!bcrypt.compareSync(user.password, userToReturn.password) || userToReturn.failed_login_attempts >= this._failedLoginAttempts)) {
      return await this._wrongPassword(userToReturn);
    }
    throw new HttpException('Mauvais identifiant ou mot de passe.',
      HttpStatus.UNAUTHORIZED);
  }

  private async _wrongPassword(user: User): Promise<any> {
    user = await this._userService.findOne(user.email);
    user.failed_login_attempts++;
    if (user.failed_login_attempts >= this._failedLoginAttempts && !user.lock_until) {
      // @ts-ignore
      user.lock_until = new Date((Date.now()));
    }
    await this._userService.findAndUpdate(user.email, {
      failed_login_attempts: user.failed_login_attempts,
      lock_until: user.lock_until
    })
    if (user.failed_login_attempts >= this._failedLoginAttempts) {
      let unlockTime = moment.duration(moment(user.lock_until).add(1, 'd').diff(moment()));
      // @ts-ignore
      unlockTime = unlockTime.asHours().toFixed(1);
      throw new HttpException(`Votre compte est bloqué suite à de trop nombreuses tentatives. Vous devez attendre ${unlockTime}h pour de nouveau vous connecter ou bien cliquer sur Mot de passe oublié.`,
        HttpStatus.UNAUTHORIZED);
    }
    if (user.failed_login_attempts === (this._failedLoginAttempts - 1)) {
      throw new HttpException('Mauvais identifiant ou mot de passe. Une seule tentative restante avant de bloquer votre compte pour 24h.',
        HttpStatus.UNAUTHORIZED);
    }
    throw new HttpException('Mauvais identifiant ou mot de passe.',
      HttpStatus.UNAUTHORIZED);
  }
}
