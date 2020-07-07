import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { IntentService } from "./intent.service";
import { IntentDto } from "@core/dto/intent.dto";
import { plainToClass } from "class-transformer";
import { Intent } from "@core/entities/intent.entity";
import camelcaseKeys = require("camelcase-keys");
import snakecaseKeys = require("snakecase-keys");
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { Pagination } from "nestjs-typeorm-paginate/index";
import { IntentFilterDto } from "@core/dto/intent-filter.dto";

@ApiTags('intent')
@Controller('intent')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class IntentController {
  constructor(private readonly _intentService: IntentService) {
  }

  @Get('')
  @ApiOperation({summary: 'Return all intents'})
  async getIntents(): Promise<IntentDto[]> {
    const intents: Intent[] = await this._intentService.findFullIntents();
    return plainToClass(IntentDto, camelcaseKeys(intents, {deep: true}));
  }

  @Get(':intentId')
  @ApiOperation({summary: 'Return specific intent'})
  async getIntent(@Param('intentId') intentId: string): Promise<IntentDto> {
    const intent: Intent = await this._intentService.findOne(intentId);
    return plainToClass(IntentDto, camelcaseKeys(intent, {deep: true}));
  }

  @Post('search')
  @ApiOperation({summary: 'Return intents paginated'})
  async getIntentsPagination(@Query() options: PaginationQueryDto,
                             @Body() filters: IntentFilterDto): Promise<IntentDto[]> {
    const intents: Pagination<Intent> = await this._intentService.paginate(options, filters);
    intents.items.map(i => plainToClass(IntentDto, camelcaseKeys(i, {deep: true})));
    // @ts-ignore
    return camelcaseKeys(intents, {deep: true});
  }

  @Post('')
  @ApiOperation({summary: 'Create or edit an intent'})
  async createEditIntent(@Body() intentDto: IntentDto): Promise<IntentDto> {
    let intent: Intent = plainToClass(Intent, snakecaseKeys(intentDto));
    intent.responses.map(r => {
      r.intent = <Intent>{id: intent.id};
      if (!r.id) {
        delete r.id;
      }
    });
    intent.knowledges = intent.knowledges.filter(k => !!k.question.trim());
    intent.knowledges.map(k => {
      k.intent = <Intent>{id: intent.id};
      if (!k.id) {
        delete k.id;
      }
    });
    intent = await this._intentService.createEdit(intent);
    return plainToClass(IntentDto, camelcaseKeys(intent, {deep: true}));
  }

  @Put(':id')
  @ApiOperation({summary: 'Edit an intent'})
  async editIntent(@Param('id') intentId: string, @Body() intentDto: IntentDto): Promise<IntentDto> {
    let intent: Intent = plainToClass(Intent, snakecaseKeys(intentDto));
    intent.responses.map(r => {
      r.intent = <Intent>{id: intent.id};
      if (!r.id) {
        delete r.id;
      }
    });
    intent.knowledges = intent.knowledges.filter(k => !!k.question.trim());
    intent.knowledges.map(k => {
      k.intent = <Intent>{id: intent.id};
      if (!k.id) {
        delete k.id;
      }
    });
    // Filter several knowledges with same questions
    intent.knowledges = intent.knowledges.filter((value, index, self) => {
      return self.findIndex(k => k.question === value.question) === index;
    })
    intent = await this._intentService.createEdit(intent, intentId);
    return plainToClass(IntentDto, camelcaseKeys(intent, {deep: true}));
  }

  @Delete(':intentId')
  @ApiOperation({summary: 'Archive an intent'})
  async deleteIntent(@Param('intentId') intentId: string): Promise<UpdateResult> {
    return this._intentService.delete(intentId);
  }
}
