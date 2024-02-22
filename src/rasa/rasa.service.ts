import { Injectable } from '@nestjs/common';
import { Intent } from '@core/entities/intent.entity';
import { RasaDomainModel } from '@core/models/rasa-domain.model';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { In } from 'typeorm';
import { IntentStatus } from '@core/enums/intent-status.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
// eslint-disable-next-line import/no-extraneous-dependencies
import { InjectS3, S3 } from 'nestjs-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Upload } from '@aws-sdk/lib-storage';
import BotLogger from '../logger/bot.logger';
import ChatbotConfigService from '../chatbot-config/chatbot-config.service';
import IntentService from '../intent/intent.service';

@Injectable()
export default class RasaService {
  private readonly logger = new BotLogger('RasaService');

  private rasaApi = process.env.RASA_API;

  private rasaToken = process.env.RASA_TOKEN;

  private rasaCallbackUrl = process.env.RASA_CALLBACK_URL;

  constructor(
    @InjectS3() private readonly s3: S3,
    private readonly intentService: IntentService,
    private readonly configService: ChatbotConfigService,
  ) {}

  /**
   * Vérification régulière si RASA a besoin et peut être entraîné
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateRasa() {
    if (!(await this.canTrainRasa()) || !(await this.needRasaTraining())) {
      return;
    }
    this.logger.log('Updating Rasa');
    await this.trainRasa();
    await this.deleteOldModels();
    this.logger.log('Finish updating Rasa');
  }

  /**
   * Vérification si on peut entraîner RASA
   * Il ne doit pas être déjà en train d'être entrainé, le Chatbot ne doit pas être bloqué et le Chatbot ne doit pas avoir besoin d'une mise à jour
   */
  async canTrainRasa(): Promise<boolean> {
    const config: ChatbotConfig = await this.configService.getChatbotConfig();
    return !config.training_rasa && !config.is_blocked && !config.need_update;
  }

  /**
   * Vérification si RASA a besoin d'être entrainé
   */
  async needRasaTraining(): Promise<boolean> {
    return (await this.configService.getChatbotConfig()).need_training;
  }

  /**
   * Génération des fichiers pour RASA
   */
  async getTrainingData() {
    const intents: Intent[] = await this.intentService.findFullIntents(
      null,
      null,
      false,
    );

    const config = await this.configService.getChatbotConfig();

    return RasaDomainModel.fromIntents(intents, config);
  }

  /**
   * Entraînement de RASA
   */
  async trainRasa() {
    try {
      this.logger.log('Starting RASA training...');
      // Mise à jour du statut d'entraînement du Chatbot et des connaissances.
      await this.configService.update(<ChatbotConfig>{ training_rasa: true });
      await this.intentService.updateManyByCondition(
        { status: In([IntentStatus.to_deploy, IntentStatus.active_modified]) },
        { status: IntentStatus.in_training },
      );

      this.logger.log('Retrieving training data');
      const domain = await this.getTrainingData();

      this.logger.log('Train rasa model');
      const qs = new URLSearchParams();
      qs.set('num_threads', '16');
      //  TODO: uncomment this
      // qs.set('save_to_default_model_directory', 'false');

      qs.set(
        'callback_url',
        `${this.rasaCallbackUrl}/api/rasa-actions/evaluations?token=${this.rasaToken}`,
      );
      qs.set('token', this.rasaToken);

      const res = await fetch(`${this.rasaApi}/model/train?${qs.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/yaml',
        },
        body: domain.dump(),
      });

      if (!res.ok) {
        throw new Error(
          `Failed to train rasa (${res.status} ${res.statusText})`,
          { cause: await res.json() },
        );
      }
    } catch (err) {
      this.logger.error('TRAIN RASA', err);
      if (err instanceof Error) {
        console.error(err);
      }
    }
  }

  async evaluateModel(model: PutObjectCommandInput['Body'], name: string) {
    try {
      this.logger.log(`Evaluating model '${name}'`);

      this.logger.log('Uploading model to S3...');
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: process.env.BUCKET_NAME,
          Key: name,
          Body: `${process.env.RASA_MODEL_DIR ?? '/models'}/${model}`,
        },
      });

      await upload.done();

      await this.reloadModel(name);

      this.logger.log(`Updating intents and training status`);
      await this.intentService.updateManyByCondition(
        { status: IntentStatus.in_training },
        { status: IntentStatus.active },
      );
      await this.intentService.updateManyByCondition(
        { status: IntentStatus.to_archive },
        { status: IntentStatus.archived },
      );
      await this.configService.update(<ChatbotConfig>{ training_rasa: false });
    } catch (err) {
      this.logger.error('FAILED TO EVALUATE RASA MODEL', err);
      await this.configService.update(<ChatbotConfig>{ training_rasa: false });
      throw err;
    }
  }

  async reloadModel(model_file: string) {
    this.logger.log('Reloading RASA model...');
    const res = await fetch(`${this.rasaApi}/model?token=${this.rasaToken}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_file,
        remote_storage: 'aws',
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to reload model`, { cause: await res.json() });
    }
  }

  /**
   * PRIVATE FUNCTIONS
   */

  /**
   * Suppression des anciens modèles
   * On en garde 5 par sécurité
   */
  private async deleteOldModels() {
    try {
      const historySize = Number.isNaN(process.env.MODEL_HISTORY_SIZE)
        ? Number(process.env.MODEL_HISTORY_SIZE)
        : 5;

      this.logger.log(`DELETING OLD MODELS, KEEP ${historySize} FOR SECURITY`);
      const objects = await this.s3.listObjectsV2({
        Bucket: process.env.BUCKET_NAME,
      });

      const sortedObjects = objects.Contents.sort(
        (a, b) => b.LastModified.getTime() - a.LastModified.getTime(),
      );

      sortedObjects.splice(0, historySize);

      await this.s3.deleteObjects({
        Bucket: process.env.BUCKET_NAME,
        Delete: {
          Objects: sortedObjects.map((o) => ({
            Key: o.Key,
          })),
        },
      });
    } catch (e) {
      this.logger.error('DELETE OLD MODELS', e);
    }
  }
}
