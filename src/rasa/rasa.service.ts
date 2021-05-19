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
import * as mkdirp from "mkdirp";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FileService } from "../file/file.service";
import { RasaStoryModel } from "@core/models/rasa-story.model";
import { RasaRuleModel } from "@core/models/rasa-rule.model";

const fs = require('fs');
const yaml = require('js-yaml');

@Injectable()
export class RasaService {

  private _chatbotTemplateDir = path.resolve(__dirname, '../../../chatbot-template');

  constructor(private readonly _intentService: IntentService,
              private readonly _configService: ChatbotConfigService,
              private _fileService: FileService) {
    // Create folder if it does not exists
    mkdirp(`${this._chatbotTemplateDir}/data`);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateRasa() {
    if (!(await this.canTrainRasa()) || !(await this.needRasaTraining())) {
      return;
    }
    console.log(`${new Date().toLocaleString()} - Updating Rasa`);
    await this.generateFiles();
    await this.trainRasa();
    await this._deleteOldModels();
    console.log(`${new Date().toLocaleString()} - Finish updating Rasa`);
  }

  async canTrainRasa(): Promise<boolean> {
    return !(await this._configService.getChatbotConfig()).training_rasa && !(await this._configService.getChatbotConfig()).is_blocked;
  }

  async needRasaTraining(): Promise<boolean> {
    return (await this._configService.getChatbotConfig()).need_training;
  }

  async generateFiles() {
    const intents: Intent[] = await this._intentService.findFullIntents(null, null, false);
    this._intentsToRasa(intents);
  }

  async trainRasa() {
    await this._configService.update(<ChatbotConfig>{training_rasa: true});
    await this._intentService.updateManyByCondition({status: In([IntentStatus.to_deploy, IntentStatus.active_modified])}, {status: IntentStatus.in_training});
    try {
      console.log(`${new Date().toLocaleString()} - TRAINING RASA`);
      await execShellCommand(`rasa train --num-threads 8`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      console.log(`${new Date().toLocaleString()} - KILLING SCREEN`);
      await execShellCommand(`pkill screen`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      console.log(`${new Date().toLocaleString()} - LAUNCHING SCREEN`);
      await execShellCommand(`screen -S rasa -dmS rasa run -m models --log-file out.log --cors "*" --debug`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      await this._intentService.updateManyByCondition({status: IntentStatus.in_training}, {status: IntentStatus.active});
      await this._intentService.updateManyByCondition({status: IntentStatus.to_archive}, {status: IntentStatus.archived});
      await this._configService.update(<ChatbotConfig>{last_training_at: new Date()});
    } catch (e) {
      console.error('RASA TRAIN', e);
    }
    await this._configService.update(<ChatbotConfig>{training_rasa: false});
  }

  /**
   * PRIVATE FUNCTIONS
   */

  /**
   * Converti des intents dans les 3 fichiers de Rasa
   * @param intents
   * @private
   */
  private _intentsToRasa(intents: Intent[]) {
    const domain = new RasaDomainModel();
    const nlu: RasaNluModel[] = [];
    // const stories: RasaStoryModel[] = [];
    const rules: RasaRuleModel[] = [];

    domain.intents = intents.map(i => i.id);
    intents.forEach(intent => {
      // Fill NLU
      nlu.push(new RasaNluModel(intent.id));
      let examples = '';
      if (intent.main_question) {
        examples += `- ${intent.main_question}\n`;
      }
      intent.knowledges.forEach(knowledge => {
        examples += `- ${knowledge.question}\n`;
      });
      nlu[nlu.length - 1].examples = examples;

      // Fill DOMAINS
      const responses = this._generateDomainUtter(intent);

      // Fill STORIES
      // stories.push(new RasaStoryModel(intent.id));
      // const steps = stories[stories.length - 1].steps;
      // steps.push({intent: intent.id});
      // Object.keys(responses).forEach(utter => {
      //   steps.push({action: utter});
      // });

      // Fill RULES
      rules.push(new RasaRuleModel(intent.id));
      const steps = rules[rules.length - 1].steps;
      steps.push({intent: intent.id});
      Object.keys(responses).forEach(utter => {
        steps.push({action: utter});
      });

      domain.responses = Object.assign(responses, domain.responses);
    });

    // Add fallback rule
    rules.push(new RasaRuleModel('nlu_fallback'));
    const steps = rules[rules.length - 1].steps;
    steps.push({intent: 'nlu_fallback'});
    steps.push({action: 'utter_phrase_hors_sujet_0'});

    fs.writeFileSync(`${this._chatbotTemplateDir}/domain.yml`, yaml.safeDump(domain), 'utf8');
    fs.writeFileSync(`${this._chatbotTemplateDir}/data/nlu.yml`, yaml.safeDump({version: "2.0", nlu: nlu}), 'utf8');
    fs.writeFileSync(`${this._chatbotTemplateDir}/data/rules.yml`, yaml.safeDump({version: "2.0", rules: rules}), 'utf8');
    // fs.writeFileSync(`${this._chatbotTemplateDir}/data/stories.yml`, yaml.safeDump({version: "2.0", stories: stories}), 'utf8');
  }

  /**
   * Génération des réponses (utter) pour un intent donné
   * @param intent
   */
  private _generateDomainUtter(intent: Intent): { [key: string]: RasaUtterResponseModel[] } {
    const responses: { [key: string]: RasaUtterResponseModel[] } = {};
    intent.responses.forEach((response: Response, index: number) => {
      switch (response.response_type) {
        case ResponseType.text:
          responses[`utter_${intent.id}_${index}`] = [{text: response.response}];
          break;
        case ResponseType.image:
          responses[`utter_${intent.id}_${index - 1}`] ? responses[`utter_${intent.id}_${index - 1}`][0].image = response.response : null;
          break;
        case ResponseType.button:
        case ResponseType.quick_reply:
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
   * Delete previous models
   */
  private async _deleteOldModels() {
    try {
      console.log(`${new Date().toLocaleString()} - DELETING OLD MODELS, KEEP 5 FOR SECURITY`);
      await execShellCommand("rm `ls -t | awk 'NR>5'`", path.resolve(this._chatbotTemplateDir, 'models')).then(res => {
        console.log(res);
      });
    } catch (e) {
      console.error('DELETE OLD MODELS', e);
    }
  }
}
