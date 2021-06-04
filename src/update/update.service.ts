import { Injectable } from '@nestjs/common';
import { UpdateChatbotDto } from "@core/dto/update-chatbot.dto";
import { AnsiblePlaybook, Options } from "ansible-playbook-cli-js";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import * as fs from "fs";

@Injectable()
export class UpdateService {

  private _appDir = '/var/www/chatbot-back';
  private _gitDir = '/var/www/git/chatbot-back';

  constructor(private _configService: ChatbotConfigService) {
  }

  async update(updateChatbot: UpdateChatbotDto, files) {
    console.log('Updating Chatbot...', updateChatbot);
    await this._updateChatbotRepos(updateChatbot);
    if (updateChatbot.domainName) {
      // @ts-ignore
      await this._configService.update({domain_name: updateChatbot.domainName});
    }
    const chatbotConfig = await this._configService.getChatbotConfig();

    if (files && files.env && files.env[0]) {
      fs.writeFileSync(`${this._appDir}/../git/.env`, files.env[0], 'utf8');
    }
    if (files && files.nginx_conf && files.nginx_conf[0]) {
      fs.writeFileSync(`${this._appDir}/../git/nginx.conf`, files.nginx_conf[0], 'utf8');
    }
    if (files && files.nginx_site && files.nginx_site[0]) {
      fs.writeFileSync(`${this._appDir}/../git/nginx_conf.cfg`, files.nginx_site[0], 'utf8');
    }

    const playbookOptions = new Options(`${this._gitDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    const extraVars = {
      ...updateChatbot, ...{
        botDomain: chatbotConfig.domain_name,
        DB_PASSWORD: process.env.DATABASE_PASSWORD
      }
    };
    console.log(`${new Date().toLocaleString()} - UPDATING CHATBOT`);
    await ansiblePlaybook.command(`generate-chatbot.yml -e '${JSON.stringify(extraVars)}'`).then(async (result) => {
      console.log(result);
      if (updateChatbot.updateLogs && updateChatbot.elastic_host && updateChatbot.elastic_username && updateChatbot.elastic_password) {
        await ansiblePlaybook.command(`elastic/elastic.yml -e '${JSON.stringify(extraVars)}'`).then((result) => {
          console.log(result);
        })
      }
      if (updateChatbot.updateBack) {
        await ansiblePlaybook.command(`reload-back.yml -e '${JSON.stringify(extraVars)}'`).then((result) => {
          console.log(result);
        })
      }
    }).catch(() => {
      console.error(`${new Date().toLocaleString()} - ERROR UPDATING CHATBOT`);
    });
  }

  private async _updateChatbotRepos(updateChatbot: UpdateChatbotDto) {
    const playbookOptions = new Options(`${this._appDir}/ansible`);
    const ansiblePlaybook = new AnsiblePlaybook(playbookOptions);
    console.log(`${new Date().toLocaleString()} - UPDATING CHATBOTS REPOSITORIES`);
    await ansiblePlaybook.command(`update-chatbot-repo.yml -e '${JSON.stringify(updateChatbot)}'`).then(async (result) => {
      console.log(result);
    }).catch(error => {
      console.error(`${new Date().toLocaleString()} - ERRROR UPDATING CHATBOTS REPOSITORIES`);
    });
  }
}
