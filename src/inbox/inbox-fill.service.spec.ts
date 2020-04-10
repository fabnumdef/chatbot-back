import { Test, TestingModule } from '@nestjs/testing';
import { InboxFillService } from './inbox-fill.service';

describe('InboxFillService', () => {
  let service: InboxFillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InboxFillService],
    }).compile();

    service = module.get<InboxFillService>(InboxFillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
