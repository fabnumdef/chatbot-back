import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { LocalAuthGuard } from "./local-auth.guard";
import { UserLoginDto } from "./dto/user-login.dto";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ description: '', type: UserLoginDto, })
  @ApiOkResponse({ description: 'result Token' })
  async login(@Request() req) {
    return req.user;
  }
}
