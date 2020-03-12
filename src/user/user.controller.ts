import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from "./user.service";
import { UserDto } from "@core/dto/user.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller('user')
@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Get('whoami')
  @ApiOperation({ summary: 'Return the user associated with the JWT token' })
  async getIntents(): Promise<UserDto> {
    return this._userService.findOne('');
  }
}
