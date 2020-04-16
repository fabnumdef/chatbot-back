import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { IntentService } from "./intent.service";
import { IntentDto } from "@core/dto/intent.dto";
import { plainToClass } from "class-transformer";
import { Intent } from "@core/entities/intent.entity";
import camelcaseKeys = require("camelcase-keys");
import { IntentModel } from "@core/models/intent.model";
import snakecaseKeys = require("snakecase-keys");
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";

@ApiTags('intent')
@Controller('intent')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class IntentController {
  constructor(private readonly _intentService: IntentService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all intents' })
  async getIntents(): Promise<IntentDto[]> {
    const intents: Intent[] = await this._intentService.findAll();
    return plainToClass(IntentDto, camelcaseKeys(intents, {deep: true}));
  }

  @Post('')
  @ApiOperation({ summary: 'Create an intent' })
  async createIntent(@Body() intent: IntentDto): Promise<IntentDto> {
    intent = await this._intentService.create(plainToClass(IntentModel, snakecaseKeys(intent)));
    return plainToClass(IntentDto, camelcaseKeys(intent, {deep: true}));
  }

  @Delete(':intentId')
  @ApiOperation({ summary: 'Archive an intent' })
  async deleteIntent(@Param('intentId') intentId: string): Promise<UpdateResult> {
    return this._intentService.delete(intentId);
  }
}
