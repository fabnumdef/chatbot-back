import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import ChatbotConfigService from '../chatbot-config/chatbot-config.service';

/**
 * Définition de la stratégie de sécurité ApiKey
 */
@Injectable()
export default class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly _configService: ChatbotConfigService) {
    // Récupération de l'API KEY via le header x-api-key et vérification s'il match avec celui en BDD
    super({ header: 'x-api-key', prefix: '' }, true, async (apikey, done) => {
      const checkKey = await _configService.validateApiKey(apikey);
      if (!checkKey) {
        return done(false);
      }
      return done(null, true);
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
