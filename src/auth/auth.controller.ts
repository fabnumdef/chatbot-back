import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "@core/dto/login-user.dto";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { AuthResponseDto } from "@core/dto/auth-response.dto";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Return jwt token' })
  async login(@Body() user: LoginUserDto): Promise<AuthResponseDto> {
    const login = await this._authService.login(user);
    return plainToClass(AuthResponseDto, camelcaseKeys(login, {deep: true}));
  }
}
