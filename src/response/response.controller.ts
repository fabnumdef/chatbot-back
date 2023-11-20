import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@core/guards/jwt.guard';
import { ResponseDto } from '@core/dto/response.dto';
import { plainToInstance } from 'class-transformer';
import { Response } from '@core/entities/response.entity';
import camelcaseKeys = require('camelcase-keys');
import { ResponseModel } from '@core/models/response.model';
import snakecaseKeys = require('snakecase-keys');
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import { UpdateResponseDto } from '@core/dto/update-response.dto';
import { ResponseService } from './response.service';

@ApiTags('response')
@Controller('response')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class ResponseController {
  constructor(private readonly _responseService: ResponseService) {}

  @Get('')
  @ApiOperation({ summary: 'Retourne toutes les réponses' })
  async getReponses(): Promise<ResponseDto[]> {
    const responses: Response[] = await this._responseService.findAll();
    return plainToInstance(
      ResponseDto,
      camelcaseKeys(responses, { deep: true }),
    );
  }

  @Post('')
  @ApiOperation({ summary: "Création d'une réponse" })
  async createResponse(@Body() response: ResponseDto): Promise<ResponseDto> {
    const responseToReturn: Response = await this._responseService.create(
      plainToInstance(ResponseModel, snakecaseKeys(response)),
    );
    return plainToInstance(
      ResponseDto,
      camelcaseKeys(responseToReturn, { deep: true }),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: "Edition d'une réponse" })
  async editResponse(
    @Param('id') responseId: string,
    @Body() response: UpdateResponseDto,
  ): Promise<UpdateResult> {
    return this._responseService.update(
      plainToInstance(ResponseModel, snakecaseKeys(response)),
    );
  }
}
