import { StatsFilterDto } from './../core/dto/stats-filter.dto';
import { Injectable } from '@nestjs/common';
import { IntentService } from "../intent/intent.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { InboxService } from "../inbox/inbox.service";



@Injectable()
export class StatsService {

  constructor(private readonly _intentService: IntentService,
              private readonly _knowledgeService: KnowledgeService,
              private readonly _inboxService: InboxService) {

  }

  getNbAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbInboxByTime(filters);
  }

  getNbVisitors(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findNbVisitorsByTime(filters);
  }
  
  getNbUniqueVisitorsByTime(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findNbUniqueVisitorsByTime(filters);
  }

  getNbUniqueVisitors(): Promise<string> {
    return this._inboxService.findNbUniqueVisitors();
  }

  getNbIntent(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNbIntentByTime(filters);
  }

  getMostAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._inboxService.findMostAskedQuestions(filters);
  }

}
