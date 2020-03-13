import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ResponseService } from "./response.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ResponseDto } from "@core/dto/response.dto";
import { plainToClass } from "class-transformer";
import { Response } from "@core/entity/response.entity";
import camelcaseKeys = require("camelcase-keys");

@ApiTags('response')
@Controller('response')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ResponseController {

  constructor(private readonly _responseService: ResponseService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all responses' })
  async getReponses(): Promise<ResponseDto[]> {
    const responses: Response[] = await this._responseService.findAll();
    return plainToClass(ResponseDto, camelcaseKeys(responses, {deep: true}));
  }

  @Post('')
  @ApiOperation({ summary: 'Create a response' })
  async createResponse(@Body() response: ResponseDto): Promise<ResponseDto> {
    const responseToReturn: Response = await this._responseService.create(response);
    return plainToClass(ResponseDto, camelcaseKeys(responseToReturn, {deep: true}));
  }
}
