import { Controller, Post, UseGuards, Request, Get, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginUserDto } from "../core/dto/login-user.dto";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginUserDto })
  async login(@Body() user: LoginUserDto) {
    return this._authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
