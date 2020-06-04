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

  getNbAskedQuestions(): Promise<Array<string>> {
    return this._inboxService.findNbInboxByTime();
  }

  getNbVisitors(): Promise<Array<string>> {
    return this._inboxService.findNbVisitorsByTime();
  }
  
  getNbUniqueVisitors(): Promise<string> {
    return this._inboxService.findNbUniqueVisitors();
  }

  getNbIntent(): Promise<Array<string>> {
    return this._intentService.findNbIntentByTime();
  }



}
