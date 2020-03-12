import { Test, TestingModule } from '@nestjs/testing';
import { ResponseController } from './response.controller';

describe('Response Controller', () => {
  let controller: ResponseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResponseController],
    }).compile();

    controller = module.get<ResponseController>(ResponseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
