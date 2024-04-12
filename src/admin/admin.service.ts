import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import InboxService from 'src/inbox/inbox.service';
import MediaService from 'src/media/media.service';

import FaqService from 'src/faq/faq.service';
import { Repository } from 'typeorm';
import { FileHistoric } from '@core/entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import IntentService from 'src/intent/intent.service';
import KnowledgeService from 'src/knowledge/knowledge.service';
import ResponseService from 'src/response/response.service';

import BotLogger from '../logger/bot.logger';

@Injectable()
export default class AdminService {
  private readonly logger = new BotLogger('AdminService');

  constructor(
    private readonly mediaService: MediaService,
    private readonly inboxService: InboxService,
    private readonly faqService: FaqService,
    @InjectRepository(FileHistoric)
    private readonly fileHistoricRepository: Repository<FileHistoric>,
    private readonly intentService: IntentService,
    private readonly knowledgeService: KnowledgeService,
    private readonly responseService: ResponseService,
  ) {}

  async resetData() {
    try {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'Vous ne pouvez pas faire cette action sur la plateforme de production.',
          null,
        );
      } else {
        this.logger.log('RESET des données en cours.');
        await this.inboxService.resetData();
        await this.faqService.resetData();
        // feeback : pas de service on supprime feebackservice
        await this.fileHistoricRepository
          .createQueryBuilder()
          .delete()
          .execute();
        // icon : Entité icon a supprimer
        await this.inboxService.resetData();
        await this.knowledgeService.resetData();
        await this.responseService.resetData();
        await this.intentService.resetData();
        await this.mediaService.resetData();
      }
    } catch (err) {
      this.logger.error('', err);
      throw new HttpException(
        `Une erreur est survenue durant la réinitialisation de vos données.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
