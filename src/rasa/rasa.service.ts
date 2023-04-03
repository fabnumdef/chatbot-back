import { Injectable } from '@nestjs/common';
import { IntentService } from "../intent/intent.service";
import { Intent } from "@core/entities/intent.entity";
import { RasaNluModel } from "@core/models/rasa-nlu.model";
import { RasaButtonModel, RasaDomainModel, RasaUtterResponseModel } from "@core/models/rasa-domain.model";
import { Response } from "@core/entities/response.entity";
import { ResponseType } from "@core/enums/response-type.enum";
import { execShellCommand } from "@core/utils";
import * as path from "path";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { In } from "typeorm";
import { IntentStatus } from "@core/enums/intent-status.enum";
import { mkdirp } from 'mkdirp';
import { Cron, CronExpression } from "@nestjs/schedule";
import { FileService } from "../file/file.service";
import { RasaRuleModel } from "@core/models/rasa-rule.model";
import { BotLogger } from "../logger/bot.logger";

const fs = require('fs');
const yaml = require('js-yaml');

@Injectable()
export class RasaService {
  private readonly _logger = new BotLogger('RasaService');

  private _chatbotTemplateDir = path.resolve(__dirname, '../../../chatbot-template');

  constructor(private readonly _intentService: IntentService,
              private readonly _configService: ChatbotConfigService,
              private _fileService: FileService) {
    // Création du répertoire si il n'existe pas
    mkdirp(`${this._chatbotTemplateDir}/data`).then();
  }

  /**
   * Vérification régulière si RASA a besoin et peut être entraîné
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateRasa() {
    if (!(await this.canTrainRasa()) || !(await this.needRasaTraining())) {
      return;
    }
    this._logger.log('Updating Rasa');
    await this.generateFiles();
    await this.trainRasa();
    await this._deleteOldModels();
    this._logger.log('Finish updating Rasa');
  }

  /**
   * Vérification si on peut entraîner RASA
   * Il ne doit pas être déjà en train d'être entrainé, le Chatbot ne doit pas être bloqué et le Chatbot ne doit pas avoir besoin d'une mise à jour
   */
  async canTrainRasa(): Promise<boolean> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig();
    return !config.training_rasa && !config.is_blocked && !config.need_update;
  }

  /**
   * Vérification si RASA a besoin d'être entrainé
   */
  async needRasaTraining(): Promise<boolean> {
    return (await this._configService.getChatbotConfig()).need_training;
  }

  /**
   * Génération des fichiers pour RASA
   */
  async generateFiles() {
    const intents: Intent[] = await this._intentService.findFullIntents(null, null, false);
    this._intentsToRasa(intents);
  }

  /**
   * Entraînement de RASA
   */
  async trainRasa() {
    // Mise à jour du statut d'entraînement du Chatbot et des connaissances.
    await this._configService.update(<ChatbotConfig>{training_rasa: true});
    await this._intentService.updateManyByCondition({status: In([IntentStatus.to_deploy, IntentStatus.active_modified])}, {status: IntentStatus.in_training});
    try {
      this._logger.log(`TRAINING RASA`);
      await execShellCommand(`${!process.env.INTRADEF || process.env.INTRADEF === 'false' ? '' : `/opt/chatbot/rasa/bin/python${process.env.PYTHON_VERSION} -m`} rasa train --finetune --epoch-fraction 0.2 --num-threads 8`, this._chatbotTemplateDir).then(async (res: string) => {
        this._logger.log(res);
        // Si le modèle ne peut pas être finetuné on le ré-entraine complétement
        if (res.includes('can not be finetuned') || res.includes('No model for finetuning') || res.includes('Cannot finetune')) {
          await execShellCommand(`${!process.env.INTRADEF || process.env.INTRADEF === 'false' ? '' : `/opt/chatbot/rasa/bin/python${process.env.PYTHON_VERSION} -m`} rasa train --num-threads 8`, this._chatbotTemplateDir).then(res => {
            this._logger.log(res);
          });
        }
      });
      this._logger.log('DISABLE TELEMETRY');
      await execShellCommand(`${!process.env.INTRADEF || process.env.INTRADEF === 'false' ? '' : `/opt/chatbot/rasa/bin/python${process.env.PYTHON_VERSION} -m`} rasa telemetry disable`, this._chatbotTemplateDir).then(res => {
        this._logger.log(res);
      });
      if (!process.env.INTRADEF || process.env.INTRADEF === 'false') {
        this._logger.log('KILLING SCREEN');
        await execShellCommand(`pkill screen`, this._chatbotTemplateDir).then(res => {
          this._logger.log(res);
        });
        this._logger.log('LAUNCHING SCREEN');
        await execShellCommand(`screen -S rasa -dmS rasa run -m models --log-file out.log --cors "*" --debug`, this._chatbotTemplateDir).then(res => {
          this._logger.log(res);
        });
        await execShellCommand(`screen -S rasa-action -dmS rasa run actions`, this._chatbotTemplateDir).then(res => {
          this._logger.log(res);
        });
      } else {
        this._logger.log('RESTART RASA SERVICE');
        await execShellCommand(`systemctl --user restart rasa-core`, this._chatbotTemplateDir).then(res => {
          this._logger.log(res);
        });
      }
      await this._intentService.updateManyByCondition({status: IntentStatus.in_training}, {status: IntentStatus.active});
      await this._intentService.updateManyByCondition({status: IntentStatus.to_archive}, {status: IntentStatus.archived});
      await this._configService.update(<ChatbotConfig>{last_training_at: new Date()});
    } catch (e) {
      this._logger.error('RASA TRAIN', e);
    }
    await this._configService.update(<ChatbotConfig>{training_rasa: false});
  }

  /**
   * PRIVATE FUNCTIONS
   */

  /**
   * Converti des connaissances dans les 3 fichiers de Rasa
   * @param intents
   * @private
   */
  private async _intentsToRasa(intents: Intent[]) {
    const domain = new RasaDomainModel();
    const nlu: RasaNluModel[] = [];
    // const stories: RasaStoryModel[] = [];
    const rules: RasaRuleModel[] = [];

    intents = intents.map(i => {
      i.id = i.id === 'phrase_hors_sujet' ? 'nlu_fallback' : i.id;
      return i;
    });
    domain.intents = intents.map(i => i.id);
    for (const intent of intents) {
      // Remplissage des NLU (questions similaires)
      nlu.push(new RasaNluModel(intent.id));
      let examples = '';
      if (intent.main_question) {
        examples += this._cleanStringForYaml(intent.main_question);
      }
      intent.knowledges.forEach(knowledge => {
        examples += this._cleanStringForYaml(knowledge.question);
      });
      nlu[nlu.length - 1].examples = examples;

      // Remplissage DOMAIN
      const responses = this._generateDomainUtter(intent);

      // Remplissage STORIES
      // stories.push(new RasaStoryModel(intent.id));
      // const steps = stories[stories.length - 1].steps;
      // steps.push({intent: intent.id});
      // Object.keys(responses).forEach(utter => {
      //   steps.push({action: utter});
      // });

      // Remplissage RULES
      const id = intent.id;
      rules.push(new RasaRuleModel(id));
      const steps = rules[rules.length - 1].steps;
      steps.push({intent: id});
      Object.keys(responses).forEach(utter => {
        steps.push({action: utter});
      });
      if (intent.id === 'nlu_fallback') {
        const config: ChatbotConfig = await this._configService.getChatbotConfig();
        domain.slots.return_suggestions.initial_value = config.show_fallback_suggestions;
        steps.push({action: 'action_fallback'});
      }

      domain.responses = Object.assign(responses, domain.responses);
    }

    // Enregistrement des fichiers RASA
    fs.writeFileSync(`${this._chatbotTemplateDir}/domain.yml`, yaml.dump(domain), 'utf8');
    fs.writeFileSync(`${this._chatbotTemplateDir}/data/nlu.yml`, yaml.dump({version: "3.1", nlu: nlu}), 'utf8');
    fs.writeFileSync(`${this._chatbotTemplateDir}/data/rules.yml`, yaml.dump({
      version: "3.1",
      rules: rules
    }), 'utf8');
    // fs.writeFileSync(`${this._chatbotTemplateDir}/data/stories.yml`, yaml.safeDump({version: "2.0", stories: stories}), 'utf8');
  }

  /**
   * Génération des réponses (utter) pour un intent donné
   * @param intent
   */
  private _generateDomainUtter(intent: Intent): { [key: string]: RasaUtterResponseModel[] } {
    const responses: { [key: string]: RasaUtterResponseModel[] } = {};
    // On itère sur chaque réponse pour la mettre au bon format
    intent.responses.forEach((response: Response, index: number) => {
      switch (response.response_type) {
        case ResponseType.text:
          responses[`utter_${intent.id}_${index}`] = [{text: this._cleanStringForYaml(response.response, false)}];
          break;
        case ResponseType.image:
          responses[`utter_${intent.id}_${index - 1}`] ? responses[`utter_${intent.id}_${index - 1}`][0].image = response.response : null;
          break;
        case ResponseType.button:
        case ResponseType.quick_reply:
          // Pour le cas des réponses bouton ou réponse rapide, on les rattache à la réponse précédente.
          if (!responses[`utter_${intent.id}_${index - 1}`]) {
            break;
          }
          const buttons: string[] = response.response.split(';');
          responses[`utter_${intent.id}_${index - 1}`][0].buttons = [];
          let utter_buttons = responses[`utter_${intent.id}_${index - 1}`][0].buttons;
          buttons.forEach(button => {
            utter_buttons.push(new RasaButtonModel(button));
          });
          break;
      }
    });
    return responses;
  }

  /**
   * Suppression des anciens modèles
   * On en garde 5 par sécurité
   */
  private async _deleteOldModels() {
    try {
      this._logger.log('DELETING OLD MODELS, KEEP 5 FOR SECURITY');
      await execShellCommand("rm `ls -t | awk 'NR>5'`", path.resolve(this._chatbotTemplateDir, 'models')).then(res => {
        this._logger.log(res);
      });
    } catch (e) {
      this._logger.error('DELETE OLD MODELS', e);
    }
  }

  /**
   * Nettoyage d'une chaîne de caractère d'emojis et d'espaces en début et fin
   * @param s
   * @private
   */
  private _cleanStringForYaml(s: string, forKnowledge = true): string {
    let stringToReturn = s?.trim()
    if (forKnowledge) {
      stringToReturn = stringToReturn
        .replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '')
        .replace(/\r?\n|\r|\s/g, ' ')
        .replace(/[\/\\"'`]/g, '')
    } else {
      stringToReturn = stringToReturn.replace(/(\r\n|\r|\n){2,}/g, '\n');
    }
    if (!stringToReturn) {
      return '';
    }
    return forKnowledge ? `- ${stringToReturn}\n` : `${stringToReturn}`;
  }
}
