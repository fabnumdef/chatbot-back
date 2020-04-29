import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@core/guards/jwt.guard";
import { MediaService } from "./media.service";
import { Media } from "@core/entities/media.entity";
import { MediaDto } from "@core/dto/media.dto";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { FileInterceptor } from "@nestjs/platform-express";
import { FileUploadDto } from "@core/dto/file-upload.dto";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { PaginationUtils } from "@core/pagination-utils";
import { Pagination } from "nestjs-typeorm-paginate/index";

@ApiTags('media')
@Controller('media')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class MediaController {

  constructor(private readonly _mediaService: MediaService) {
  }

  @Get('')
  @ApiOperation({summary: 'Return all medias'})
  async getMedias(@Query() query: PaginationQueryDto): Promise<MediaDto[]> {
    const medias: Media[] = await this._mediaService.findAll(
      PaginationUtils.setPaginationOptions(query, Media.getAttributesToSearch())
    );
    return plainToClass(MediaDto, camelcaseKeys(medias, {deep: true}));
  }

  @Get('search')
  @ApiOperation({summary: 'Return medias paginated'})
  async getMediasPagination(@Query() options: PaginationQueryDto): Promise<Pagination<MediaDto>> {
    const medias: Pagination<Media> = await this._mediaService.paginate(options);
    medias.items.map(i => plainToClass(MediaDto, camelcaseKeys(i, {deep: true})));
    // @ts-ignore
    return camelcaseKeys(medias, {deep: true});
  }

  @Post('')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          // 5Mb
          fileSize: 5e+6
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

  @Put(':id')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          // 5Mb
          fileSize: 5e+6
        },
        fileFilter: MediaService.mediaFilter,
      }
    )
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier à remplacer',
    type: FileUploadDto,
  })
  @ApiOperation({summary: 'Replace media'})
  async replaceMedia(@Param('id') mediaId: string, @UploadedFile() file): Promise<MediaDto> {
    const media = await this._mediaService.update(parseInt(mediaId), file);
    return plainToClass(MediaDto, camelcaseKeys(media, {deep: true}));
  }

  @Delete(':id')
  @ApiOperation({summary: 'Delete media'})
  async deleteMedia(@Param('id') mediaId: number): Promise<void> {
    await this._mediaService.delete(mediaId);
  }
}
