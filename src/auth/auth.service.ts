import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "../core/dto/login-user.dto";

@Injectable()
export class AuthService {

  constructor(private readonly _userService: UserService,
              private readonly _jwtService: JwtService) {
  }

  async validateUser(user: LoginUserDto): Promise<any> {
    const userToReturn = await this._userService.findOne(user.email);
    if (userToReturn && userToReturn.password === user.password) {
      const {password, ...result} = userToReturn;
      return result;
    }
    throw new HttpException('Mauvais identifiant ou mot de passe.',
      HttpStatus.UNAUTHORIZED);
  }

  async login(user: LoginUserDto) {
    const userToReturn = await this.validateUser(user);
    if (userToReturn) {
      return {
        chatbot_factory_token: this._jwtService.sign(JSON.parse(JSON.stringify(userToReturn))),
      };
    }
    return null;
  }
}
