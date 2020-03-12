import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ResponseService } from "./response.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ResponseDto } from "@core/dto/response.dto";

@ApiTags('response')
@Controller('response')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ResponseController {

  constructor(private readonly _responseService: ResponseService) {}

  @Get('')
  async getIntents(): Promise<ResponseDto[]> {
    return this._responseService.findAll();
  }

  @Post('')
  async createKnowledge(@Body() response: ResponseDto): Promise<ResponseDto> {
    return this._responseService.create(response);
  }
}
