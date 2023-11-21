import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@core/guards/jwt.guard';
import { Media } from '@core/entities/media.entity';
import { MediaDto } from '@core/dto/media.dto';
import { plainToInstance } from 'class-transformer';
import camelcaseKeys = require('camelcase-keys');
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadDto } from '@core/dto/file-upload.dto';
import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { User } from '@core/entities/user.entity';
import { MediaModel } from '@core/models/media.model';
import { Response } from 'express';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('media')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class MediaController {
  constructor(private readonly _mediaService: MediaService) {}

  @Get('')
  @ApiOperation({ summary: 'Retourne tout les médias' })
  async getMedias(): Promise<MediaDto[]> {
    const medias: Media[] = await this._mediaService.findAll();
    return plainToInstance(MediaDto, camelcaseKeys(medias, { deep: true }));
  }

  @Get('export')
  @ApiOperation({ summary: 'Exporte tout les médias en .zip' })
  async exportMedias(@Res() res: Response): Promise<any> {
    return this._mediaService.export(res);
  }

  @Post('search')
  @ApiOperation({ summary: 'Retourne les médias paginés' })
  async getMediasPagination(
    @Query() options: PaginationQueryDto,
  ): Promise<Pagination<MediaDto>> {
    const medias: Pagination<MediaModel> = await this._mediaService.paginate(
      options,
    );
    medias.items.map((i) =>
      plainToInstance(MediaDto, camelcaseKeys(i, { deep: true })),
    );
    // @ts-ignore
    return camelcaseKeys(medias, { deep: true });
  }

  @Post('')
  @UseInterceptors(
    FilesInterceptor('files', 100, {
      limits: {
        // 5Mb
        fileSize: 5e6,
      },
      fileFilter: MediaService.mediaFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier à ajouter',
    type: FileUploadDto,
  })
  @ApiOperation({ summary: "Ajout d'un fichier à la médiathèque" })
  async addFile(@UploadedFiles() files, @Req() req): Promise<MediaDto[]> {
    const userRequest: User = req.user;
    const medias = await Promise.all(
      files.map((file) => this._mediaService.create(file, userRequest)),
    );
    return plainToInstance(MediaDto, camelcaseKeys(medias, { deep: true }));
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        // 5Mb
        fileSize: 5e6,
      },
      fileFilter: MediaService.mediaFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier à remplacer',
    type: FileUploadDto,
  })
  @ApiOperation({ summary: "Remplacement d'un média" })
  async replaceMedia(
    @Param('id') mediaId: string,
    @UploadedFile() file,
    @Req() req,
  ): Promise<MediaDto> {
    const userRequest: User = req.user;
    const media = await this._mediaService.update(
      parseInt(mediaId),
      file,
      userRequest,
    );
    return plainToInstance(MediaDto, camelcaseKeys(media, { deep: true }));
  }

  @Put(':id/edit')
  @ApiBody({
    description: 'Fichier à modifier',
    type: MediaDto,
  })
  @ApiOperation({ summary: "Edition d'un media" })
  async editMedia(
    @Param('id') mediaId: string,
    @Body() file: { file: string },
  ): Promise<MediaDto> {
    const fileName = encodeURI(file.file.trim());
    const media = await this._mediaService.edit(parseInt(mediaId), fileName);
    return plainToInstance(MediaDto, camelcaseKeys(media, { deep: true }));
  }

  @Delete(':id')
  @ApiOperation({ summary: "Suppression d'un média" })
  async deleteMedia(@Param('id') mediaId: number): Promise<void> {
    await this._mediaService.delete(mediaId);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Suppression de plusieurs médias' })
  async deleteMedias(@Body() ids: number[]): Promise<void> {
    await this._mediaService.deleteMultiples(ids);
  }
}
