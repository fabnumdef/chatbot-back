import {
  Body,
  Controller, Get,
  HttpException,
  HttpStatus,
  Post, Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileService } from "./file.service";
import { FileUploadDto } from "@core/dto/file-upload.dto";
import { ImportFileDto } from "@core/dto/import-file.dto";
import { ImportResponseDto } from "@core/dto/import-response.dto";
import { TemplateFileCheckResumeDto } from "@core/dto/template-file-check-resume.dto";
import { plainToClass } from "class-transformer";
import { FileHistoric } from "@core/entities/file.entity";
import { FileHistoricDto } from "@core/dto/file-historic.dto";
import camelcaseKeys = require("camelcase-keys");
import { RolesGuard } from "@core/guards/roles.guard";
import { UserRole } from "@core/enums/user-role.enum";
import { Roles } from "@core/decorators/roles.decorator";
import { BotLogger } from "../logger/bot.logger";

@ApiTags('file')
@Controller('file')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.admin)
export class FileController {
  private readonly _logger = new BotLogger('FileController');

  constructor(private readonly _fileService: FileService) {
  }

  @Post('check')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        fileFilter: FileService.excelFileFilter,
        limits: {
          fileSize: 1e+7
        },
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Base de connaissance (excel)',
    type: FileUploadDto,
  })
  @ApiOperation({summary: 'Vérification du fichier excel'})
  checkTemplateFile(@UploadedFile() file): TemplateFileCheckResumeDto {
    return this._fileService.checkFile(file);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        fileFilter: FileService.excelFileFilter,
        limits: {
          fileSize: 1e+7
        },
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Base de connaissance (excel)',
    type: ImportFileDto,
  })
  @ApiOperation({summary: 'Téléchargement de la base de connaissance'})
  async importFile(@UploadedFile() file,
                   @Body() importFile: ImportFileDto): Promise<ImportResponseDto> {
    const errors = this._fileService.checkFile(file).errors;
    if (errors && Object.keys(errors).length > 0) {
      throw new HttpException('Le fichier contient des erreurs bloquantes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    // @ts-ignore
    importFile.deleteIntents = (importFile.deleteIntents == 'true');
    return await this._fileService.importFile(file, importFile);
  }

  @Get('export')
  @ApiOperation({summary: 'Export de la base de connaissance'})
  async exportFile(@Res() res): Promise<any> {
    try{
      const streamFile = await this._fileService.exportXls();
      res.setHeader("Content-disposition", `attachment;`);
      res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      streamFile.pipe(res);
    }
    catch (err) {
      this._logger.error('', err);
      throw new HttpException(`Une erreur est survenue durant l'export de la base de connaissance`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('historic')
  @ApiOperation({summary: "Retourne l'historique de la base de connaissances"})
  async getHistory(): Promise<FileHistoricDto[]> {
    const files: FileHistoric[] = await this._fileService.findAll();
    return plainToClass(FileHistoricDto, camelcaseKeys(files, {deep: true}));
  }
}
