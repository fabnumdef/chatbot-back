import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import JwtGuard from '@core/guards/jwt.guard';
import IntentService from '../intent/intent.service';

@ApiTags('ref-data')
@Controller('ref-data')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export default class RefDataController {
  constructor(private readonly intentService: IntentService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Retourne toutes les catégories' })
  async getCategories(): Promise<string[]> {
    return this.intentService.findAllCategories(true);
  }
}
