import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserService } from "./user.service";
import { UserDto } from "@core/dto/user.dto";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { User } from "@core/entities/user.entity";
import { CreateUserDto } from "@core/dto/create-user.dto";
import snakecaseKeys = require("snakecase-keys");
import { UserModel } from "@core/models/user.model";
import { JwtGuard } from "@core/guards/jwt.guard";
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@core/enums/user-role.enum";
import { Roles } from "@core/decorators/roles.decorator";

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all users' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  async getUsers(): Promise<UserDto[]> {
    const users: User[] = await this._userService.findAll();
    return plainToClass(UserDto, camelcaseKeys(users, {deep: true}));
  }

  // TODO: Pour le développement, à voir commencer insérer les users par la suite
  @Post('admin')
  @ApiOperation({ summary: 'Generate admin user' })
  @ApiBody({
    description: 'User',
    type: CreateUserDto,
  })
  async generateAdminUser(@Body() user: CreateUserDto): Promise<UserDto> {
    const userModel = await this._userService.generateAdminUser(plainToClass(UserModel, snakecaseKeys(user)));
    return plainToClass(UserDto, camelcaseKeys(userModel, {deep: true}));
  }

  @Post('')
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({
    description: 'User',
    type: CreateUserDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async create(@Body() user: CreateUserDto): Promise<UserDto> {
    const userModel = await this._userService.create(plainToClass(UserModel, snakecaseKeys(user)));
    return plainToClass(UserDto, camelcaseKeys(userModel, {deep: true}));
  }

  @Delete(':email')
  @ApiOperation({ summary: 'Delete user' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async delete(@Param('email') email: string): Promise<void> {
    return this._userService.delete(email);
  }
}
