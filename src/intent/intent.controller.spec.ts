import { Test, TestingModule } from '@nestjs/testing';
import { IntentController } from './intent.controller';

describe('Intent Controller', () => {
  let controller: IntentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntentController],
    }).compile();

    controller = module.get<IntentController>(IntentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
