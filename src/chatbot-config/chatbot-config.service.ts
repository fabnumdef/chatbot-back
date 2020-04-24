import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";

@Injectable()
export class ChatbotConfigService {

  constructor(@InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>) {
  }

  getChatbotConfig(): Promise<ChatbotConfig> {
    return this._configRepository.findOne(1);
  }

  save(config: ChatbotConfig): Promise<ChatbotConfig> {
    return this._configRepository.save(config);
  }

}
