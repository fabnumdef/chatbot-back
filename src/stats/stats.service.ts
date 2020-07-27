import { StatsFilterDto } from './../core/dto/stats-filter.dto';
import { Injectable } from '@nestjs/common';
import { IntentService } from "../intent/intent.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { InboxService } from "../inbox/inbox.service";
import { StatsMostAskedQuestionsDto } from "@core/dto/stats-most-asked-questions.dto";



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

  getNbUniqueVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findNbUniqueVisitors(filters);
  }

  getNbIntent(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNbIntentByTime(filters);
  }

  getMostAskedQuestions(filters: StatsFilterDto): Promise<StatsMostAskedQuestionsDto[]> {
    return this._inboxService.findMostAskedQuestions(filters);
  }

  getNeverAskedQuestions(filters: StatsFilterDto): Promise<Array<string>> {
    return this._intentService.findNeverUsedIntent(filters);
  }

  getAvgQuestPerVisitors(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgQuestPerVisitor(filters);
  }

  getAvgResponseTime(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findAvgResponseTime(filters);
  }

  getRatioResponseOk(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters);
  }

  getRatioResponseSure(filters: StatsFilterDto): Promise<string> {
    return this._inboxService.findRatioResponseOk(filters, 0.95);
  }

}
