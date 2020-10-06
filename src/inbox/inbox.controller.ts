import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException, HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { InboxService } from "./inbox.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { plainToClass } from "class-transformer";
import { Inbox } from "@core/entities/inbox.entity";
import camelcaseKeys = require("camelcase-keys");
import { InboxDto } from "@core/dto/inbox.dto";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { Pagination } from "nestjs-typeorm-paginate";
import { InboxFilterDto } from "@core/dto/inbox-filter.dto";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { InboxUpdateDto } from "@core/dto/inbox-update.dto";

@ApiTags('inbox')
@Controller('inbox')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class InboxController {
  constructor(private readonly _inboxService: InboxService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all inboxes' })
  async getInboxes(@Query() query: PaginationQueryDto): Promise<InboxDto[]> {
    const inboxes: Inbox[] = await this._inboxService.findAll();
    return plainToClass(InboxDto, camelcaseKeys(inboxes, {deep: true}));
  }

  @Get('export')
  async exportFile(@Body() filters: InboxFilterDto,
                   @Res() res): Promise<any> {
    try{
      const streamFile = await this._inboxService.exportXls(filters);
      res.setHeader("Content-disposition", `attachment;`);
      res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      streamFile.pipe(res);
    }
    catch (err) {
      console.error(`${new Date().toLocaleString()} - ${JSON.stringify(err)}`);
      throw new HttpException(`Une erreur est survenue durant l'export des requêtes.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'Return all inboxes' })
  async getInboxesPaginated(@Query() options: PaginationQueryDto,
                            @Body() filters: InboxFilterDto): Promise<InboxDto[]> {
    const inboxes: Pagination<Inbox> = await this._inboxService.paginate(options, filters);
    inboxes.items.map(i => {
      i.response = i.response ? JSON.parse(i.response) : i.response;
      i.intent_ranking = i.intent_ranking ? JSON.parse(i.intent_ranking) : i.intent_ranking;
      plainToClass(InboxDto, camelcaseKeys(i, {deep: true}))
    });
    // @ts-ignore
    return camelcaseKeys(inboxes, {deep: true});
  }

  @Post(':inboxId/validate')
  @ApiOperation({ summary: 'Validate an inbox' })
  async validateInbox(@Param('inboxId') inboxId: number): Promise<UpdateResult> {
    return this._inboxService.validate(inboxId);
  }

  @Post(':inboxId/assign')
  @ApiOperation({ summary: 'Assign an inbox' })
  async unassignInbox(@Param('inboxId') inboxId: number): Promise<UpdateResult> {
    return this._inboxService.assign(inboxId, null);
  }

  @Post(':inboxId/assign/:userEmail')
  @ApiOperation({ summary: 'Assign an inbox' })
  async assignInbox(@Param('inboxId') inboxId: number,
                    @Param('userEmail') userEmail: string): Promise<UpdateResult> {
    return this._inboxService.assign(inboxId, userEmail);
  }

  @Put(':inboxId')
  @ApiOperation({ summary: 'Edit an inbox' })
  async editInbox(@Param('inboxId') inboxId: string,
                  @Body() inboxEdit: InboxUpdateDto): Promise<InboxDto> {
    const inboxEntity = await this._inboxService.save(<Inbox> {...{id: parseInt(inboxId, 10)}, ...inboxEdit});
    return plainToClass(InboxDto, camelcaseKeys(inboxEntity, {deep: true}));
  }

  @Delete(':inboxId')
  @ApiOperation({ summary: 'Archive an inbox' })
  async deleteInbox(@Param('inboxId') inboxId: number): Promise<UpdateResult> {
    return this._inboxService.delete(inboxId);
  }
}
