import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inbox } from "@core/entities/inbox.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { PaginationUtils } from "@core/pagination-utils";
import { InboxFilterDto } from "@core/dto/inbox-filter.dto";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { Knowledge } from "@core/entities/knowledge.entity";
import { plainToClass } from "class-transformer";
import { IntentService } from "../intent/intent.service";
import { Intent } from "@core/entities/intent.entity";

@Injectable()
export class InboxService {

  constructor(@InjectRepository(Inbox)
              private readonly _inboxesRepository: Repository<Inbox>,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _intentService: IntentService) {
  }

  findAll(params = {
    where: {
      status: InboxStatus.pending
    }
  }): Promise<Inbox[]> {
    return this._inboxesRepository.find(params);
  }

  findOne(inboxId) {
    return this._inboxesRepository.findOne(inboxId, {relations: ['intent']});
  }

  async paginate(options: PaginationQueryDto, filters: InboxFilterDto): Promise<Pagination<Inbox>> {
    const results = await paginate<Inbox>(this._inboxesRepository, options, PaginationUtils.setQuery(options, Inbox.getAttributesToSearch()));

    // Récupération des intents liés
    return new Pagination(
      await Promise.all(results.items.map(async (item: Inbox) => {
        const intent = await this._intentService.findByInbox(item);
        item.intent = plainToClass(Intent, intent);

        return item;
      })),
      results.meta,
      results.links,
    );
  }

  async validate(inboxId): Promise<UpdateResult> {
    const inbox = await this.findOne(inboxId);
    const newKnowledge: Knowledge = {
      id: null,
      intent: inbox.intent,
      question: inbox.question
    }
    await this._knowledgeService.createSafe(newKnowledge);
    return this.delete(inboxId);
  }

  delete(inboxId): Promise<UpdateResult> {
    return this._inboxesRepository.update({id: inboxId}, {status: InboxStatus.archived});
  }

}
