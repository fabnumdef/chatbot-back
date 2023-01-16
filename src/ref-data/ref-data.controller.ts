import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { IntentService } from "../intent/intent.service";

@ApiTags('ref-data')
@Controller('ref-data')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class RefDataController {
  constructor(private readonly _intentService: IntentService) {
  }

  @Get('categories')
  @ApiOperation({summary: 'Retourne toutes les catégories'})
  async getCategories(): Promise<string[]> {
    return this._intentService.findAllCategories(true);
  }
}
