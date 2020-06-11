import { Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { RasaService } from "./rasa.service";
import { FileService } from "../file/file.service";

@ApiTags('rasa')
@Controller('rasa')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class RasaController {

  constructor(private readonly _rasaService: RasaService,
              private readonly _fileService: FileService) {}

  @Post('train')
  @ApiOperation({ summary: 'Convert DB to Rasa files & train chatbot' })
  async trainRasa(): Promise<void> {
    if(await this._rasaService.isRasaTraining()) {
      throw new HttpException(`Le chatbot est déjà entrain d'être mis à jour. Merci de patienter quelques minutes.`, HttpStatus.NOT_ACCEPTABLE);
    }

    await this._rasaService.generateFiles();
    await this._rasaService.trainRasa();
    await this._fileService.storeFile();
    return;
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
