import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InboxService } from "./inbox.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { plainToClass } from "class-transformer";
import { Inbox } from "@core/entities/inbox.entity";
import camelcaseKeys = require("camelcase-keys");
import { InboxDto } from "@core/dto/inbox.dto";
import { PaginationUtils } from "@core/pagination-utils";
import { Media } from "@core/entities/media.entity";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";

@ApiTags('inbox')
@Controller('inbox')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class InboxController {
  constructor(private readonly _inboxService: InboxService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all inboxes' })
  async getInboxes(@Query() query: PaginationQueryDto): Promise<InboxDto[]> {
    const inboxes: Inbox[] = await this._inboxService.findAll(
      PaginationUtils.setPaginationOptions(query, Media.getAttributesToSearch())
    );
    return plainToClass(InboxDto, camelcaseKeys(inboxes, {deep: true}));
  }
}
