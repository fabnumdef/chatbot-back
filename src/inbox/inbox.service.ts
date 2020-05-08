import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inbox } from "@core/entities/inbox.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { PaginationUtils } from "@core/pagination-utils";
import { InboxFilterDto } from "@core/dto/inbox-filter.dto";

@Injectable()
export class InboxService {

  constructor(@InjectRepository(Inbox)
              private readonly _inboxesRepository: Repository<Inbox>) {
  }

  findAll(params =   {
    where: {
      status: InboxStatus.pending
    }
  }): Promise<Inbox[]> {
    return this._inboxesRepository.find(params);
  }

  async paginate(options: PaginationQueryDto, filters: InboxFilterDto): Promise<Pagination<Inbox>> {
    return paginate<Inbox>(this._inboxesRepository, options, PaginationUtils.setQuery(options, Inbox.getAttributesToSearch()));
  }

}
