import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "../core/dto/login-user.dto";
import { AuthResponseDto } from "@core/dto/auth-response.dto";

@Injectable()
export class AuthService {

  constructor(private readonly _userService: UserService,
              private readonly _jwtService: JwtService) {
  }

  async validateUser(user: LoginUserDto): Promise<any> {
    const userToReturn = await this._userService.findOne(user.email, user.password);
    if (userToReturn) {
      const {password, ...result} = userToReturn;
      return result;
    }
    throw new HttpException('Mauvais identifiant ou mot de passe.',
      HttpStatus.UNAUTHORIZED);
  }

  async login(user: LoginUserDto): Promise<AuthResponseDto> {
    const userToReturn = await this.validateUser(user);
    if (userToReturn) {
      return {
        chatbotFactoryToken: this._jwtService.sign(JSON.parse(JSON.stringify(userToReturn))),
        user: userToReturn
      };
    }
    return null;
  }
}
