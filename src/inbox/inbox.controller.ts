import { InboxFilterDto } from '@core/dto/inbox-filter.dto';
import { InboxUpdateDto } from '@core/dto/inbox-update.dto';
import { InboxDto } from '@core/dto/inbox.dto';
import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { Inbox } from '@core/entities/inbox.entity';
import JwtGuard from '@core/guards/jwt.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Pagination } from 'nestjs-typeorm-paginate';
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import camelcaseKeys = require('camelcase-keys');
import BotLogger from '../logger/bot.logger';
import InboxService from './inbox.service';

@ApiTags('inbox')
@Controller('inbox')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class InboxController {
  private readonly logger = new BotLogger('InboxController');

  constructor(private readonly inboxService: InboxService) {}

  @Get('')
  @ApiOperation({ summary: 'Retourne toutes les requêtes' })
  async getInboxes(): Promise<InboxDto[]> {
    const inboxes: Inbox[] = await this.inboxService.findAll();
    return plainToInstance(InboxDto, camelcaseKeys(inboxes, { deep: true }));
  }

  @Post('export')
  @ApiOperation({ summary: 'Exporte toutes les requêtes' })
  async exportFile(
    @Query() options: PaginationQueryDto,
    @Body() filters: InboxFilterDto,
    @Res() res,
  ): Promise<any> {
    try {
      const streamFile = await this.inboxService.exportXls(options, filters);
      res.setHeader('Content-disposition', `attachment;`);
      res.contentType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      streamFile.pipe(res);
    } catch (err) {
      this.logger.error('', err);
      throw new HttpException(
        `Une erreur est survenue durant l'export des requêtes.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'Retournes les requêtes paginées' })
  async getInboxesPaginated(
    @Query() options: PaginationQueryDto,
    @Body() filters: InboxFilterDto,
  ): Promise<InboxDto[]> {
    const inboxes: Pagination<Inbox> = await this.inboxService.paginate(
      options,
      filters,
    );
    inboxes.items.map((i) => {
      // eslint-disable-next-line no-param-reassign
      i.response = i.response ? JSON.parse(i.response) : i.response;
      // eslint-disable-next-line no-param-reassign
      i.intent_ranking = i.intent_ranking
        ? JSON.parse(i.intent_ranking)
        : i.intent_ranking;
      plainToInstance(InboxDto, camelcaseKeys(<any>i, { deep: true }));
      return i;
    });
    return camelcaseKeys(<any>inboxes, { deep: true });
  }

  @Post(':inboxId/validate')
  @ApiOperation({ summary: 'Valide une requête' })
  async validateInbox(
    @Param('inboxId') inboxId: number,
  ): Promise<UpdateResult> {
    return this.inboxService.validate(inboxId);
  }

  @Post(':inboxId/assign')
  @ApiOperation({ summary: 'Désassigne une requête' })
  async unassignInbox(
    @Param('inboxId') inboxId: number,
  ): Promise<UpdateResult> {
    return this.inboxService.assign(inboxId, null);
  }

  @Post(':inboxId/assign/:userEmail')
  @ApiOperation({ summary: 'Assigne une requête' })
  async assignInbox(
    @Param('inboxId') inboxId: number,
    @Param('userEmail') userEmail: string,
  ): Promise<UpdateResult> {
    return this.inboxService.assign(inboxId, userEmail);
  }

  @Put(':inboxId')
  @ApiOperation({ summary: "Edition d'une requête" })
  async editInbox(
    @Param('inboxId') inboxId: string,
    @Body() inboxEdit: InboxUpdateDto,
  ): Promise<InboxDto> {
    const inboxEntity = await this.inboxService.save(<Inbox>{
      ...{ id: parseInt(inboxId, 10) },
      ...inboxEdit,
    });
    return plainToInstance(
      InboxDto,
      camelcaseKeys(<any>inboxEntity, { deep: true }),
    );
  }

  @Delete(':inboxId')
  @ApiOperation({ summary: 'Archive une requête' })
  async deleteInbox(@Param('inboxId') inboxId: number): Promise<UpdateResult> {
    return this.inboxService.delete(inboxId);
  }
}
