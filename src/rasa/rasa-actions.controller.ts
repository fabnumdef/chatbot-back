import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import RasaGuard from '@core/guards/rasa.guard';
import { v4 as uuid } from 'uuid';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Request } from 'express';
import RasaService from './rasa.service';

@ApiTags('rasa-actions')
@Controller('rasa-actions')
@UseGuards(RasaGuard)
export default class RasaActionsController {
  constructor(private readonly rasaService: RasaService) {}

  @Post('/evaluations')
  @HttpCode(204)
  async evaluateRasa(@Req() req: Request) {
    if (req.headers['content-type'] !== 'application/x-tar') {
      throw new HttpException(
        "Rasa evalusations only accepts 'application/x-tar'",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    console.log(req.headers);

    this.rasaService.evaluateModel(req.body, `${Date.now()}-${uuid()}.tar.gz`);
  }
}
