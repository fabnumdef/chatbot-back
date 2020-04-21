import { Test, TestingModule } from '@nestjs/testing';
import { RefDataController } from './ref-data.controller';

describe('RefData Controller', () => {
  let controller: RefDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefDataController],
    }).compile();

    controller = module.get<RefDataController>(RefDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
