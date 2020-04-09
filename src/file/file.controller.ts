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

@ApiTags('file')
@Controller('file')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class FileController {

  constructor(private readonly _fileService: FileService) {
  }

  @Post('check')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        fileFilter: FileService.excelFileFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Base de connaissance (excel)',
    type: FileUploadDto,
  })
  @ApiOperation({summary: 'Check excel file'})
  checkTemplateFile(@UploadedFile() file): TemplateFileCheckResumeDto {
    return this._fileService.checkFile(file);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        fileFilter: FileService.excelFileFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Base de connaissance (excel)',
    type: FileUploadDto,
  })
  @ApiOperation({summary: 'Upload de la base de connaissance'})
  async importFile(@UploadedFile() file,
                   @Body() importFile: ImportFileDto): Promise<ImportResponseDto> {
    const errors = this._fileService.checkFile(file).errors;
    if (errors && Object.keys(errors).length > 0) {
      throw new HttpException('Le fichier contient des erreurs bloquantes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return await this._fileService.importFile(file, importFile);
  }

  @Get('export')
  async exportFile(@Res() res): Promise<any> {
    try{
      const streamFile = await this._fileService.exportXls();
      res.setHeader("Content-disposition", `attachment;`);
      res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      streamFile.pipe(res);
    }
    catch (err) {
      console.error(err);
      throw new HttpException(`Une erreur est survenue durant l'export de la base de connaissance`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
