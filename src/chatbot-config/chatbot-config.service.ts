import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { MediaService } from "../media/media.service";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { Cron, CronExpression } from "@nestjs/schedule";

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
      if (fromDb || !embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this._mediaService.deleteFile(currentConfig.icon);
      }
      if (fromDb || embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this._mediaService.deleteFile(currentConfig.embedded_icon);
      }
      if (fromDb) {
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
    console.log('UPDATING MANIFESTS');
    const frontDir = path.resolve(__dirname, '../../../chatbot-front');
    const webchatDir = path.resolve(__dirname, '../../../webchat');

    // Create folder if it does not exists
    mkdirp(`${frontDir}/assets/icons`);
    mkdirp(`${webchatDir}/assets/icons`);

    const botConfig = await this.getChatbotConfig();
    // @ts-ignore
    const manifest = JSON.parse(fs.readFileSync(path.resolve(frontDir, 'manifest.webmanifest')));
    // @ts-ignore
    const manifestWebchat = JSON.parse(fs.readFileSync(path.resolve(webchatDir, 'manifest.webmanifest')));
    manifest.name = `BACKOFFICE - ${botConfig.name}`;
    manifest.short_name = `BACKOFFICE - ${botConfig.name}`;
    manifestWebchat.name = botConfig.name;
    manifestWebchat.short_name = botConfig.name;
    fs.writeFileSync(path.resolve(frontDir, 'manifest.webmanifest'), JSON.stringify(manifest));
    fs.writeFileSync(path.resolve(webchatDir, 'manifest.webmanifest'), JSON.stringify(manifestWebchat));
    fs.copyFileSync(path.resolve(__dirname, '../../mediatheque', botConfig.icon), path.resolve(frontDir, 'assets/icons/icon.png'));
    fs.copyFileSync(path.resolve(__dirname, '../../mediatheque', botConfig.icon), path.resolve(webchatDir, 'assets/icons/icon.png'));
  }

  // Check icons to update manifests
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async _checkIcons() {
    const frontDir = path.resolve(__dirname, '../../../chatbot-front');
    if (!fs.existsSync(path.resolve(frontDir, 'assets/icons/icon.png'))) {
      this.updateFrontManifest();
    }
  }

}
