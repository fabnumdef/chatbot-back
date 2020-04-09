import { Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { MediaService } from "./media.service";
import { Media } from "@core/entities/media.entity";
import { MediaDto } from "@core/dto/media.dto";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { FileInterceptor } from "@nestjs/platform-express";
import { FileService } from "../file/file.service";
import { FileUploadDto } from "@core/dto/file-upload.dto";
import { TemplateFileCheckResumeDto } from "@core/dto/template-file-check-resume.dto";

@ApiTags('media')
@Controller('media')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class MediaController {
  constructor(private readonly _mediaService: MediaService) {}

  @Get('')
  @ApiOperation({ summary: 'Return all medias' })
  async getMedias(): Promise<MediaDto[]> {
    const medias: Media[] = await this._mediaService.findAll();
    return plainToClass(MediaDto, camelcaseKeys(medias, {deep: true}));
  }

  @Post('')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          // 5MB
          fileSize: 5242880
        },
        fileFilter: MediaService.mediaFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier à ajouter',
    type: FileUploadDto,
  })
  @ApiOperation({summary: 'Ajout d\'un fichier à la médiathèque'})
  async addFile(@UploadedFile() file): Promise<MediaDto> {
    const media = await this._mediaService.create(file);
    return plainToClass(MediaDto, camelcaseKeys(media, {deep: true}));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  async deleteMedia(@Param('id') mediaId: number): Promise<void> {
    await this._mediaService.delete(mediaId);
  }
}
