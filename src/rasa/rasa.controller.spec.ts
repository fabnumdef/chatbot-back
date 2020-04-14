import { Test, TestingModule } from '@nestjs/testing';
import { RasaController } from './rasa.controller';

describe('Rasa Controller', () => {
  let controller: RasaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RasaController],
    }).compile();

    controller = module.get<RasaController>(RasaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
