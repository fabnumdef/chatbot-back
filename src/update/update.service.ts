import {
  UpdateChatbotDto,
  UpdateDomainNameDto,
} from '@core/dto/update-chatbot.dto';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { dotenvToJson, jsonToDotenv } from '@core/utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AnsiblePlaybook, Options } from 'ansible-playbook-cli-js';
import * as fs from 'fs';
import * as path from 'path';
import ChatbotConfigService from '../chatbot-config/chatbot-config.service';
import BotLogger from '../logger/bot.logger';

@Injectable()
export default class UpdateService {
  private readonly logger = new BotLogger('UpdateService');

  private appDir = path.resolve(__dirname, '../../../chatbot-back');

  private gitDir = path.resolve(__dirname, '../../../git/chatbot-back');

  constructor(private configService: ChatbotConfigService) {}

  /**
   * Vérification si une mise à jour du code source peut se lancer
   * @param updateChatbot
   * @param files
   * @param retry
   */
  async launchUpdate(updateChatbot: UpdateChatbotDto, files, retry = false) {
    const config: ChatbotConfig = await this.configService.getChatbotConfig();
    // Si une mise à jour est déjà planifiée, on arrête
    if (config.need_update && !retry) {
      this.logger.error('UPDATE - update already planned', null);
      throw new HttpException(
        `Une mise à jour est déjà prévue.`,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
    await this.configService.update(<ChatbotConfig>{ need_update: true });
    if (config.training_rasa) {
      this.logger.log('UPDATE - Waiting for RASA to train bot');
      // On retente toutes les minutes
      setTimeout(() => {
        this.launchUpdate(updateChatbot, files, true);
      }, 60 * 1000);
    } else {
      try {
        await this.update(updateChatbot, files);
      } catch (err) {}
      await this.configService.update(<ChatbotConfig>{ need_update: false });
    }
  }

  /**
   * Mise à jour du code source du Chatbot
   * @param updateChatbot
   * @param files
   */
  async update(updateChatbot: UpdateChatbotDto, files) {
    this.logger.log('Updating Chatbot...', JSON.stringify(updateChatbot));
    // Mise à jour des repos git
    await this.updateChatbotRepos(updateChatbot);
    if (updateChatbot.domainName) {
      // @ts-ignore
      await this.configService.update({
        domain_name: updateChatbot.domainName,
      });
    }

    // Si il y a des nouveaux fichiers passés en paramètre, on les met à jour
    if (files && files.env && files.env[0]) {
      fs.writeFileSync(`${this.appDir}/../git/.env`, files.env[0], 'utf8');
    }
    if (files && files.nginx_conf && files.nginx_conf[0]) {
      fs.writeFileSync(
        `${this.appDir}/../git/nginx.conf`,
        files.nginx_conf[0].buffer,
        'utf8',
      );
    }
    if (files && files.nginx_site && files.nginx_site[0]) {
      fs.writeFileSync(
        `${this.appDir}/../git/nginx_conf.cfg`,
        files.nginx_site[0].buffer,
        'utf8',
      );
    }

    const playbookOptions = new Options(`${this.gitDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    const extraVars = {
      ...updateChatbot,
      ...{
        DATABASE_HOST: process.env.DATABASE_HOST,
        DATABASE_PORT: process.env.DATABASE_PORT,
        DATABASE_USER: process.env.DATABASE_USER,
        DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
        DATABASE_NAME: process.env.DATABASE_NAME,
      },
    };
    this.logger.log('DEPLOYING CHATBOT APP');
    await ansiblePlaybook
      .command(`playDeployapp.yml -e '${JSON.stringify(extraVars)}'`)
      .then(async (result) => {
        this.logger.log(JSON.stringify(result));
        // if (updateChatbot.updateLogs && updateChatbot.elastic_host && updateChatbot.elastic_username && updateChatbot.elastic_password) {
        //   await ansiblePlaybook.command(`elastic/elastic.yml -e '${JSON.stringify(extraVars)}'`).then((result) => {
        //     this.logger.log(JSON.stringify(result));
        //   })
        // }
        if (updateChatbot.updateBack) {
          await ansiblePlaybook
            .command(`playReloadback.yml -e '${JSON.stringify(extraVars)}'`)
            .then((result) => {
              this.logger.log(JSON.stringify(result));
            });
        }
      })
      .catch((e) => {
        this.logger.error('ERROR DEPLOYING CHATBOT APP', e);
      });
  }

  /**
   * Mise à jour du nom de domaine de l'application
   * @param domainName
   */
  async updateDomainName(domainName: UpdateDomainNameDto) {
    const playbookOptions = new Options(`${this.gitDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    const extraVars = {
      ...{
        botDomain: domainName.domainName,
        ansible_user: 'ansible',
        ansible_become_pass: domainName.userPassword,
      },
    };
    this.logger.log('UPDATING DOMAIN NAME');
    await ansiblePlaybook
      .command(`playUpdatenginx.yml -e '${JSON.stringify(extraVars)}'`)
      .then(async (result) => {
        this.logger.log(JSON.stringify(result));
        this.updateDomainNameEnv(domainName.domainName);
      })
      .catch((e) => {
        this.logger.error('ERROR UPDATING DOMAIN NAME', e);
      });
  }

  /**
   * Mise à jour du nom de domaine de l'application dans les fichiers .env
   * @param domainName
   * @private
   */
  private async updateDomainNameEnv(domainName: string) {
    this.logger.log('UPDATING DOMAIN NAME ENV');
    const dotenv = dotenvToJson(fs.readFileSync(`${this.appDir}/.env`, 'utf8'));
    dotenv.HOST_URL = `https://${domainName}`;

    try {
      fs.writeFileSync(`${this.appDir}/.env`, jsonToDotenv(dotenv), 'utf8');
      fs.writeFileSync(
        `${this.appDir}/dist/.env`,
        jsonToDotenv(dotenv),
        'utf8',
      );
      fs.writeFileSync(`${this.gitDir}/../.env`, jsonToDotenv(dotenv), 'utf8');
      const playbookOptions = new Options(`${this.gitDir}/ansible`);
      const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
      await ansiblePlaybook
        .command(`playReloadback.yml -e '{"updateBack": true}'`)
        .then((result) => {
          this.logger.log(JSON.stringify(result));
        });
    } catch (e) {
      this.logger.error('ERROR UPDATING DOMAIN NAME ENV', e);
    }
  }

  /**
   * Mise à jour des repos git
   * @param updateChatbot
   * @private
   */
  private async updateChatbotRepos(updateChatbot: UpdateChatbotDto) {
    const playbookOptions = new Options(`${this.appDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    this.logger.log('UPDATING CHATBOTS REPOSITORIES');
    await ansiblePlaybook
      .command(`playUpdaterepos.yml -e '${JSON.stringify(updateChatbot)}'`)
      .then(async (result) => {
        this.logger.log(JSON.stringify(result));
      })
      .catch((error) => {
        this.logger.log('ERRROR UPDATING CHATBOTS REPOSITORIES', error);
      });
  }
}
