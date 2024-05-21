import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import * as path from 'path';
import { FindOneOptions, Repository } from 'typeorm';
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import BotLogger from '../logger/bot.logger';
import MediaService from '../media/media.service';
import snakecaseKeys = require('snakecase-keys');

const crypto = require('crypto');

@Injectable()
export default class ChatbotConfigService {
  private readonly logger = new BotLogger('ChatbotConfigService');

  constructor(
    @InjectRepository(ChatbotConfig)
    private readonly configRepository: Repository<ChatbotConfig>,
    private readonly mediaService: MediaService,
  ) {
    this.initConfig();
  }

  /**
   * Récupération de la configuration du Chatbot
   * @param options
   */
  getChatbotConfig(options?: FindOneOptions): Promise<ChatbotConfig> {
    const fullOptions: FindOneOptions = { ...{ where: { id: 1 } }, ...options };
    return this.configRepository.findOne(fullOptions);
  }

  /**
   * Mise à jour de la configuration du Chatbot
   * @param config
   */
  update(config: Partial<ChatbotConfig>): Promise<UpdateResult> {
    return this.configRepository.update({ id: 1 }, config);
  }

  /**
   * Sauvegarde de la configuration du Chatbot
   * @param config
   */
  save(config: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
    return this.configRepository.save(config);
  }

  /**
   * Suppression de la configuration du Chatbot
   * Suppression des fichiers stockés sur le serveur
   * @param fromDb
   * @param embedded
   */
  async delete(fromDb = true, embedded = false) {
    try {
      if (fromDb || !embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this.mediaService.deleteFile(currentConfig.icon);
      }
      if (fromDb || embedded) {
        const currentConfig = await this.getChatbotConfig();
        await this.mediaService.deleteFile(currentConfig.embedded_icon);
      }
      if (fromDb) {
        await this.configRepository.delete(1);
      }
    } catch (e) {
      /* empty */
    }
  }

  /**
   * Vérification si le fichier reçu est une image
   * @param req
   * @param file
   * @param callback
   */
  static imageFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|png|svg)$/)) {
      return callback(
        new HttpException(
          'Seul les fichiers en .jpg, .png et .svg sont acceptés.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
    return callback(null, true);
  };

  /**
   * Mise à jour du manifeste afin d'utiliser le bot comme une application Android / IOS (PWA)
   */
  async updateFrontManifest() {
    if(process.env.NODE_ENV === 'local') {
      this.logger.log('Env is LOCAL. Skipping manifest update');
      return
    }

    const frontDir = process.env.FRONT_DIR ?? path.resolve(__dirname, '../../../chatbot-front');
    const webchatDir = process.env.WEBCHAT_DIR ?? path.resolve(__dirname, '../../../webchat');

    // Création du dossier si il n'existe pas
    await mkdirp(`${frontDir}/assets/icons`);
    await mkdirp(`${webchatDir}/assets/icons`);

    const botConfig = await this.getChatbotConfig();
    if (!botConfig) {
      return;
    }
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.resolve(frontDir, 'manifest.webmanifest'), 'utf-8'),
      );
      const manifestWebchat = JSON.parse(
        fs.readFileSync(path.resolve(webchatDir, 'manifest.webmanifest'), 'utf-8'),
      );

      manifest.name = `BACKOFFICE - ${botConfig.name}`;
      manifest.short_name = `BACKOFFICE - ${botConfig.name}`;
      manifestWebchat.name = botConfig.name;
      manifestWebchat.short_name = botConfig.name;
      fs.writeFileSync(
        path.resolve(frontDir, 'manifest.webmanifest'),
        JSON.stringify(manifest),
      );
      fs.writeFileSync(
        path.resolve(webchatDir, 'manifest.webmanifest'),
        JSON.stringify(manifestWebchat),
      );
      if (botConfig.icon) {
        const filesDirectory = process.env.MEDIA_DIR ?? path.resolve(__dirname, '../../mediatheque');

        fs.copyFileSync(
          path.resolve(filesDirectory, botConfig.icon),
          path.resolve(frontDir, 'assets/icons/icon.png'),
        );
        fs.copyFileSync(
          path.resolve(filesDirectory, botConfig.icon),
          path.resolve(webchatDir, 'assets/icons/icon.png'),
        );
      }
    } catch (e) {
      this.logger.error('ERROR UPDATING MANIFESTS', e);
    }
  }

  /**
   * Vérification régulière s'il n'y a pas d'icône présente pour la PWA (notamment lors de la création du Chatbot)
   * @private
   */
  @Cron(CronExpression.EVERY_HOUR)
  private async checkIcons() {
    const frontDir = path.resolve(__dirname, '../../../chatbot-front');
    if (!fs.existsSync(path.resolve(frontDir, 'assets/icons/icon.png'))) {
      this.updateFrontManifest();
    }
  }

  /**
   * S'il n'y a pas de configuration au démarrage (premier démarrage notamment), on crée une configuration vide pour pouvoir la mettre à jour depuis le Backoffice
   * @private
   */
  private async initConfig() {
    const config = await this.getChatbotConfig();
    if (!config) {
      await this.save(<ChatbotConfig>{});
    }
  }

  /**
   * Validation de l'API KEY
   * @param apiKey
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    return (await this.getChatbotConfig()).api_key === apiKey;
  }

  /**
   * Mise à jour de l'API KEY via une fonction random
   */
  updateApiKey(): Promise<UpdateResult> {
    const newApiKey = crypto.randomBytes(12).toString('hex');
    return this.update(
      plainToInstance(ChatbotConfig, snakecaseKeys({ api_key: newApiKey })),
    );
  }
}
