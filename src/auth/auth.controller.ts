import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "@core/dto/login-user.dto";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Return jwt token' })
  async login(@Body() user: LoginUserDto) {
    return this._authService.login(user);
  }
}
