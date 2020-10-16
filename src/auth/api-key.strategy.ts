import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { HeaderAPIKeyStrategy } from "passport-headerapikey";
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  constructor(private readonly _configService: ChatbotConfigService) {
    super({header: 'x-api-key', prefix: ''}, true, async (apikey, done, req) => {
      const checkKey = await _configService.validateApiKey(apikey);
      if (!checkKey) {
        return done(false);
      }
      return done(true);
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
