import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, Repository } from "typeorm";
import { Media } from "@core/entities/media.entity";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { PaginationUtils } from "@core/pagination-utils";
import { ResponseService } from "../response/response.service";
import { User } from "@core/entities/user.entity";
import { IntentService } from "../intent/intent.service";
import { MediaModel } from "@core/models/media.model";
import { plainToClass } from "class-transformer";
import { IntentModel } from "@core/models/intent.model";

@Injectable()
export class MediaService {

  private _filesDirectory = path.resolve(__dirname, '../../mediatheque');

  constructor(@InjectRepository(Media)
              private readonly _mediasRepository: Repository<Media>,
              private readonly _responseService: ResponseService,
              private readonly _intentService: IntentService) {
    // Create folder if it does not exists
    mkdirp(this._filesDirectory);
  }

  findAll(params = {}): Promise<Media[]> {
    return this._mediasRepository.find(params);
  }

  async paginate(options: PaginationQueryDto): Promise<Pagination<MediaModel>> {
    const results = await paginate<Media>(this._mediasRepository, options, PaginationUtils.setQuery(options, Media.getAttributesToSearch()));

    // Récupération des intents liés
    return new Pagination(
      await Promise.all(results.items.map(async (item: MediaModel) => {
        const intents = await this._intentService.findByMedia(item);
        item.intents = plainToClass(IntentModel, intents);

        return item;
      })),
      results.meta,
      results.links,
    );
  }

  findOne(id: number): Promise<Media> {
    return this._mediasRepository.findOne(id);
  }

  findOneWithParam(param: any): Promise<Media> {
    return this._mediasRepository.findOne(param);
  }

  async create(file: any, user: User): Promise<Media> {
    const fileName = escape(file.originalname.trim());
    if (fileName.length > 50) {
      throw new HttpException('Le nom du fichier ne doit pas dépasser 50 caractères.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const fileExists = await this.findOneWithParam({file: fileName});
    if (fileExists) {
      throw new HttpException('Un média avec le même nom existe déjà.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: null,
      file: fileName,
      // size in KB
      size: Math.round(stats['size'] / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
      created_at: null
    }
    return this._mediasRepository.save(fileToSave);
  }

  async update(mediaId: number, file: any, user: User): Promise<Media> {
    const fileName = escape(file.originalname.trim());
    if (fileName.length > 50) {
      throw new HttpException('Le nom du fichier ne doit pas dépasser 50 caractères.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const fileExists = await this.findOneWithParam({file: fileName});
    if (fileExists && fileExists.id !== mediaId) {
      throw new HttpException('Un média avec le même nom existe déjà.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const oldFile = await this.findOne(mediaId);
    try {
      fs.unlinkSync(path.resolve(this._filesDirectory, oldFile.file));
    } catch (e) {
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: mediaId,
      file: fileName,
      // size in KB
      size: Math.round(stats['size'] / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
      created_at: new Date().getTime()
    }
    const mediaUpdated = await this._mediasRepository.save(fileToSave);

    await this._responseService.updateFileResponses(oldFile.file, mediaUpdated.file);

    return mediaUpdated;
  }

  async delete(id: number): Promise<DeleteResult> {
    const fileExists = await this.findOne(id);
    if (!fileExists) {
      throw new HttpException('Ce média n\'existe pas.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    fs.unlinkSync(path.resolve(this._filesDirectory, fileExists.file));
    return this._mediasRepository.delete(id);
  }


  /************************************************************************************ STATIC ************************************************************************************/

  static mediaFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(gif|jpg|jpeg|png|ppt|pptx|odp|xls|xlsx|ods|csv|pdf|doc|odt|txt)$/)) {
      return callback(new HttpException('Seules les extensions suivantes sont autorisées: gif, jpg, jpeg, png, ppt, pptx, odp, xls, xlsx, ods, csv, pdf, doc, odt, txt.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };

}
