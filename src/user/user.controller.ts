import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from "./user.service";
import { UserDto } from "@core/dto/user.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { User } from "@core/entity/user.entity";

@Controller('user')
@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Get('whoami')
  @ApiOperation({ summary: 'Return the user associated with the JWT token' })
  async getIntents(@Req() req): Promise<UserDto> {
    const user: User = await this._userService.findOne(req.user.email);
    return plainToClass(UserDto, camelcaseKeys(user, {deep: true}));
  }
}
