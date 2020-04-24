import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConfigController } from './chatbot-config.controller';

describe('Config Controller', () => {
  let controller: ChatbotConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotConfigController],
    }).compile();

    controller = module.get<ChatbotConfigController>(ChatbotConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
