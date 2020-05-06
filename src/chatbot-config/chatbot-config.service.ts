import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { MediaService } from "../media/media.service";

@Injectable()
export class ChatbotConfigService {

  constructor(@InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>,
              private readonly  _mediaService: MediaService) {
  }

  getChatbotConfig(): Promise<ChatbotConfig> {
    return this._configRepository.findOne(1);
  }

  save(config: ChatbotConfig): Promise<ChatbotConfig> {
    return this._configRepository.save(config);
  }

  async delete(fromDb = true) {
    try {
      const currentConfig = await this.getChatbotConfig();
      await this._mediaService.deleteFile(currentConfig.icon);
      if(fromDb) {
        await this._configRepository.delete(1);
      }
    } catch (e) {
    }
  }

  static imageFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|png|svg)$/)) {
      return callback(new HttpException('Seul les fichiers en .jpg, .png et .svg sont acceptés.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };

}
