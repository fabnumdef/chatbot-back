import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "@core/dto/login-user.dto";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { AuthResponseDto } from "@core/dto/auth-response.dto";
import { ResetPasswordDto } from "@core/dto/reset-password.dto";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('reset-password/:email')
  @ApiOperation({ summary: 'Generate reset password token & send email' })
  async forgotPassword(@Param('email') email: string): Promise<any> {
    return await this._authService.sendEmailPasswordToken(email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password & send mail' })
  async resetPassword(@Body() resetPassword: ResetPasswordDto): Promise<any> {
    return await this._authService.resetPassword(resetPassword);
  }

  @Post('login')
  @ApiOperation({ summary: 'Return jwt token' })
  async login(@Body() user: LoginUserDto): Promise<AuthResponseDto> {
    const login = await this._authService.login(user);
    return plainToClass(AuthResponseDto, camelcaseKeys(login, {deep: true}));
  }
}
