import { AuthResponseDto } from '@core/dto/auth-response.dto';
import { LoginUserDto } from '@core/dto/login-user.dto';
import { ResetPasswordDto } from '@core/dto/reset-password.dto';
import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import camelcaseKeys = require('camelcase-keys');
import AuthService from './auth.service';

@ApiTags('auth')
@Controller('auth')
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('reset-password/:email')
  @ApiOperation({
    summary: "Génération du token de reset password & envoi d'email",
  })
  async forgotPassword(@Param('email') email: string): Promise<any> {
    return this.authService.sendEmailPasswordToken(email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: "Reset password & envoi d'email" })
  async resetPassword(@Body() resetPassword: ResetPasswordDto): Promise<any> {
    return this.authService.resetPassword(resetPassword);
  }

  @Post('login')
  @ApiOperation({ summary: 'Retourne le token jwt' })
  async login(@Body() user: LoginUserDto): Promise<AuthResponseDto> {
    const login = await this.authService.login(user);
    return plainToInstance(
      AuthResponseDto,
      camelcaseKeys(<any>login, { deep: true }),
    );
  }
}
