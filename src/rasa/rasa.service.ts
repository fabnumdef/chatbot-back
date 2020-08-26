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
    if(await this.isRasaTraining() || !(await this.needRasaTraining())) {
      return;
    }
    console.log(`${new Date().toLocaleString()} - Updating Rasa`);
    await this.generateFiles();
    await this.trainRasa();
    await this._deleteOldModels();
    console.log(`${new Date().toLocaleString()} - Finish updating Rasa`);
  }

  async isRasaTraining(): Promise<boolean> {
    return (await this._configService.getChatbotConfig()).training_rasa;
  }

  async needRasaTraining(): Promise<boolean> {
    return (await this._configService.getChatbotConfig()).need_training;
  }

  async generateFiles() {
    const intents: Intent[] = await this._intentService.findFullIntents();
    this._intentsToRasa(intents);
  }

  async trainRasa() {
    await this._configService.update(<ChatbotConfig>{training_rasa: true});
    await this._intentService.updateManyByCondition({status: In([IntentStatus.to_deploy, IntentStatus.active_modified])}, {status: IntentStatus.in_training});
    try {
      console.log(`${new Date().toLocaleString()} - TRAINING RASA`);
      await execShellCommand(`rasa train --augmentation 50`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      console.log(`${new Date().toLocaleString()} - KILLING SCREEN`);
      await execShellCommand(`pkill screen`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      console.log(`${new Date().toLocaleString()} - LAUNCHING SCREEN`);
      await execShellCommand(`screen -S rasa -dmS rasa run -m models --enable-api --log-file out.log --cors "*" --debug`, this._chatbotTemplateDir).then(res => {
        console.log(res);
      });
      await this._intentService.updateManyByCondition({status: IntentStatus.in_training}, {status: IntentStatus.active});
      await this._intentService.updateManyByCondition({status: IntentStatus.to_archive}, {status: IntentStatus.archived});
      await this._configService.update(<ChatbotConfig>{last_training_at: new Date()});
    } catch(e) {
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
    console.log(intents[0]);
    console.log(intents[1]);
    const domain = new RasaDomainModel();
    const nlu = domain.nlu;
    const stories = domain.stories;

    domain.intents = intents.map(i => i.id);
    intents.forEach(intent => {
      // Fill NLU
      nlu.push(new RasaNluModel(intent.id));
      const examples = nlu[nlu.length - 1].examples;
      examples.push(intent.id);
      if (intent.main_question) {
        examples.push(intent.main_question);
      }
      intent.knowledges.forEach(knowledge => {
        examples.push(knowledge.question);
      });

      // Fill DOMAINS
      const responses = this._generateDomainUtter(intent);

      // Fill STORIES
      stories.push(new RasaStoryModel(intent.id));
      const steps = stories[stories.length - 1].steps;
      steps.push({intent: intent.id});
      Object.keys(responses).forEach(utter => {
        steps.push({action: utter});
      });
      domain.responses = Object.assign(responses, domain.responses);
    });

    console.log(domain);

    // fs.writeFileSync(`${this._chatbotTemplateDir}/domain.yml`, yaml.safeDump(domain), 'utf8');
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
          responses[`utter_${intent.id}_${index - 1}`][0].image = response.response;
          break;
        case ResponseType.button:
          const buttons: string[] = response.response.split(';');
          responses[`utter_${intent.id}_${index - 1}`][0].buttons = [];
          let utter_buttons = responses[`utter_${intent.id}_${index - 1}`][0].buttons;
          buttons.forEach(button => {
            utter_buttons.push(new RasaButtonModel(button));
          });
          responses[`utter_${intent.id}_${index - 1}`][0].buttons = [new RasaButtonModel(response.response)];
          break;
        case ResponseType.quick_reply:
          const quick_replies: string[] = response.response.split(';');
          responses[`utter_${intent.id}_${index - 1}`][0].buttons = [];
          let utter_buttons_bis = responses[`utter_${intent.id}_${index - 1}`][0].buttons;
          quick_replies.forEach(quick_reply => {
            utter_buttons_bis.push(new RasaButtonModel(quick_reply));
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
    } catch(e) {
      console.error('DELETE OLD MODELS', e);
    }
  }
}
