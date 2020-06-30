import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { MediaService } from "../media/media.service";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class ChatbotConfigService {

  constructor(@InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>,
              private readonly  _mediaService: MediaService) {
  }

  getChatbotConfig(options?: FindOneOptions): Promise<ChatbotConfig> {
    return this._configRepository.findOne(1, options);
  }

  update(config: ChatbotConfig): Promise<UpdateResult> {
    return this._configRepository.update({id: 1}, config);
  }

  save(config: ChatbotConfig): Promise<ChatbotConfig> {
    return this._configRepository.save(config);
  }

  async delete(fromDb = true, embedded = false) {
    try {
      if(fromDb || !embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this._mediaService.deleteFile(currentConfig.icon);
      }
      if(fromDb || embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this._mediaService.deleteFile(currentConfig.embedded_icon);
      }
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

  async updateFrontManifest() {
    const frontDir = path.resolve(__dirname, '../../../chatbot-front');
    const botConfig = await this.getChatbotConfig();
    // @ts-ignore
    const manifest = JSON.parse(fs.readFileSync(path.resolve(frontDir, 'manifest.webmanifest')));
    manifest.name = botConfig.name;
    manifest.short_name = botConfig.name;
    fs.writeFileSync(path.resolve(frontDir, 'manifest.webmanifest'), JSON.stringify(manifest));
    fs.copyFileSync(path.resolve(__dirname, '../../mediatheque', botConfig.icon), path.resolve(frontDir, 'assets/icons/icon.png'));
  }

}
