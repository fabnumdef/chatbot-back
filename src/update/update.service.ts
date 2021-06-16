import { Injectable } from '@nestjs/common';
import { UpdateChatbotDto } from "@core/dto/update-chatbot.dto";
import { AnsiblePlaybook, Options } from "ansible-playbook-cli-js";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import * as fs from "fs";
import { BotLogger } from "../logger/bot.logger";

@Injectable()
export class UpdateService {
  private readonly _logger = new BotLogger('UpdateService');

  private _appDir = '/var/www/chatbot-back';
  private _gitDir = '/var/www/git/chatbot-back';

  constructor(private _configService: ChatbotConfigService) {
  }

  async update(updateChatbot: UpdateChatbotDto, files) {
    this._logger.log('Updating Chatbot...', JSON.stringify(updateChatbot));
    await this._updateChatbotRepos(updateChatbot);
    if (updateChatbot.domainName) {
      // @ts-ignore
      await this._configService.update({domain_name: updateChatbot.domainName});
    }
    const chatbotConfig = await this._configService.getChatbotConfig();

    console.log(files);
    if (files && files.env && files.env[0]) {
      fs.writeFileSync(`${this._appDir}/../git/.env`, files.env[0], 'utf8');
    }
    if (files && files.nginx_conf && files.nginx_conf[0]) {
      fs.writeFileSync(`${this._appDir}/../git/nginx.conf`, files.nginx_conf[0].buffer, 'utf8');
    }
    if (files && files.nginx_site && files.nginx_site[0]) {
      fs.writeFileSync(`${this._appDir}/../git/nginx_conf.cfg`, files.nginx_site[0].buffer, 'utf8');
    }

    const playbookOptions = new Options(`${this._gitDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    const extraVars = {
      ...updateChatbot, ...{
        botDomain: chatbotConfig.domain_name,
        DB_PASSWORD: process.env.DATABASE_PASSWORD
      }
    };
    this._logger.log('UPDATING CHATBOT');
    await ansiblePlaybook.command(`generate-chatbot.yml -e '${JSON.stringify(extraVars)}'`).then(async (result) => {
      this._logger.log(JSON.stringify(result));
      if (updateChatbot.updateLogs && updateChatbot.elastic_host && updateChatbot.elastic_username && updateChatbot.elastic_password) {
        await ansiblePlaybook.command(`elastic/elastic.yml -e '${JSON.stringify(extraVars)}'`).then((result) => {
          this._logger.log(JSON.stringify(result));
        })
      }
      if (updateChatbot.updateBack) {
        await ansiblePlaybook.command(`reload-back.yml -e '${JSON.stringify(extraVars)}'`).then((result) => {
          this._logger.log(JSON.stringify(result));
        })
      }
    }).catch((e) => {
      this._logger.error('ERROR UPDATING CHATBOT', e);
    });
  }

  async updateDomainName(domainName) {
    const playbookOptions = new Options(`${this._gitDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    const extraVars = {
      ...{
        botDomain: domainName
      }
    };
    this._logger.log('UPDATING DOMAIN NAME');
    await ansiblePlaybook.command(`nginx-conf.yml -e '${JSON.stringify(extraVars)}'`).then(async (result) => {
      this._logger.log(JSON.stringify(result));
    }).catch((e) => {
      this._logger.error('ERROR UPDATING DOMAIN NAME', e);
    });
  }

  private async _updateChatbotRepos(updateChatbot: UpdateChatbotDto) {
    const playbookOptions = new Options(`${this._appDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    this._logger.log('UPDATING CHATBOTS REPOSITORIES');
    await ansiblePlaybook.command(`update-chatbot-repo.yml -e '${JSON.stringify(updateChatbot)}'`).then(async (result) => {
      this._logger.log(JSON.stringify(result));
    }).catch(error => {
      this._logger.log('ERRROR UPDATING CHATBOTS REPOSITORIES', error);
    });
  }
}
