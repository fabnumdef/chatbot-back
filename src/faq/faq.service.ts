import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FaqEvents } from "@core/entities/faq-events.entity";

@Injectable()
export class FaqService {
  constructor(@InjectRepository(FaqEvents)
              private readonly _faqEventsRepository: Repository<FaqEvents>) {
  }

  connectToFaq(senderId: string) {
    return this._createFaqEvent(senderId, 'connection');
  }

  searchCategory(senderId: string, category: string) {
    return this._createFaqEvent(senderId, 'category', category);
  }

  clickIntent(senderId: string, intentId: string) {
    return this._createFaqEvent(senderId, 'intent', null, intentId);
  }

  private async _createFaqEvent(senderId: string, type: string, category?: string, intent?: string) {
    if (!senderId) {
      return;
    }
    const toCreate = <FaqEvents>{
      sender_id: senderId,
      type_name: type,
      category_name: category ? category : null,
      intent_name: intent ? intent : null
    };
    return await this._faqEventsRepository.save(toCreate);
  }
}
