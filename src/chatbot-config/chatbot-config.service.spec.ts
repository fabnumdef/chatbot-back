import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConfigService } from './chatbot-config.service';

describe('ConfigService', () => {
  let service: ChatbotConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotConfigService],
    }).compile();

    service = module.get<ChatbotConfigService>(ChatbotConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
