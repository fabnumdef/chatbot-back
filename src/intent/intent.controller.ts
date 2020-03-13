import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IntentService } from "./intent.service";
import { IntentDto } from "@core/dto/intent.dto";
import { plainToClass } from "class-transformer";
import { Intent } from "@core/entity/intent.entity";
import camelcaseKeys = require("camelcase-keys");

@ApiTags('intent')
@Controller('intent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
    intent = await this._intentService.create(intent);
    return plainToClass(IntentDto, camelcaseKeys(intent, {deep: true}));
  }
}
