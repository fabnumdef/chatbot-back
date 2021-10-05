import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, FindManyOptions, Repository } from "typeorm";
import { Media } from "@core/entities/media.entity";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { paginate, Pagination } from "nestjs-typeorm-paginate/index";
import { PaginationUtils } from "@core/pagination-utils";
import { ResponseService } from "../response/response.service";
import { User } from "@core/entities/user.entity";
import { MediaModel } from "@core/models/media.model";
import { plainToClass } from "class-transformer";
import { IntentModel } from "@core/models/intent.model";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { Response } from "express";
import { Intent } from "@core/entities/intent.entity";
import { BotLogger } from "../logger/bot.logger";

const getSize = require('get-folder-size');
const archiver = require('archiver');

@Injectable()
export class MediaService {

  private _filesDirectory = path.resolve(__dirname, '../../mediatheque');
  private readonly _logger = new BotLogger('MediaService');

  constructor(@InjectRepository(Media)
              private readonly _mediasRepository: Repository<Media>,
              private readonly _responseService: ResponseService,
              @InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>,
              @InjectRepository(Intent)
              private readonly _intentsRepository: Repository<Intent>,) {
    // Create folder if it does not exists
    mkdirp(this._filesDirectory);
  }

  findAll(params = {}): Promise<Media[]> {
    return this._mediasRepository.find(params);
  }

  async paginate(options: PaginationQueryDto): Promise<Pagination<MediaModel>> {
    const results = await paginate(
      this.getMediaQueryBuilder(PaginationUtils.setQuery(options, Media.getAttributesToSearch())),
      options
    );

    // Récupération des intents liés
    return new Pagination(
      await Promise.all(results.items.map(async (item: MediaModel) => {
        const intents = await this._findIntentsByMedia(item);
        item.intents = plainToClass(IntentModel, intents);

        return item;
      })),
      results.meta,
      results.links,
    );
  }

  getMediaQueryBuilder(findManyOptions: FindManyOptions) {
    const query = this._mediasRepository.createQueryBuilder('media')
      .where(!!findManyOptions.where ? findManyOptions.where.toString() : `'1'`)
      .addOrderBy('media.created_at', 'DESC');

    return query;
  }

  findOne(id: number): Promise<Media> {
    return this._mediasRepository.findOne(id);
  }

  findOneWithParam(param: any): Promise<Media> {
    return this._mediasRepository.findOne(param);
  }

  async create(file: any, user: User): Promise<Media> {
    const fileName = await this.storeFile(file);
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: null,
      file: fileName,
      // size in KB
      size: Math.round(stats['size'] / 1000),
      added_by: `${user.first_name} ${user.last_name}`
    }
    return this._mediasRepository.save(fileToSave);
  }

  async update(mediaId: number, file: any, user: User): Promise<Media> {
    const fileName = escape(file.originalname.trim());
    if (fileName.length > 255) {
      throw new HttpException('Le nom du fichier ne doit pas dépasser 255 caractères.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const fileExists = await this.findOneWithParam({file: fileName});
    if (fileExists && fileExists.id !== mediaId) {
      throw new HttpException('Un média avec le même nom existe déjà.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const oldFile = await this.findOne(mediaId);
    try {
      fs.unlinkSync(path.resolve(this._filesDirectory, oldFile.file));
    } catch (e) {
      this._logger.error(`Error unlinking old file`, e);
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    this._updateMediaSize();
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: mediaId,
      file: fileName,
      // size in KB
      size: Math.round(stats['size'] / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
      // @ts-ignore
      created_at: new Date()
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
    try {
      this.deleteFile(fileExists.file);
    } catch (e) {
    }
    return this._mediasRepository.delete(id);
  }

  async storeFile(file): Promise<string> {
    const fileName = escape(file.originalname.trim());
    if (fileName.length > 255) {
      throw new HttpException('Le nom du fichier ne doit pas dépasser 255 caractères.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const fileExists = await this.findOneWithParam({file: fileName});
    if (fileExists) {
      throw new HttpException('Un média avec le même nom existe déjà.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    this._updateMediaSize();
    return fileName;
  }

  async deleteFile(filePath: string) {
    fs.unlinkSync(path.resolve(this._filesDirectory, filePath));
  }

  export(res: Response) {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    //set the archive name
    res.attachment('MEDIATHEQUE.zip');

    //this is the streaming magic
    archive.pipe(res);
    archive.directory(this._filesDirectory, false);
    archive.finalize();
  }


  /************************************************************************************ STATIC ************************************************************************************/

  static mediaFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(gif|jpg|jpeg|png|ppt|pptx|odp|xls|xlsx|ods|csv|pdf|doc|odt|txt)$/)) {
      return callback(new HttpException('Seules les extensions suivantes sont autorisées: gif, jpg, jpeg, png, ppt, pptx, odp, xls, xlsx, ods, csv, pdf, doc, odt, txt.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };

  private _updateMediaSize() {
    getSize(this._filesDirectory, (err, sizeInB) => {
      const sizeInGb = Math.round((sizeInB / 1024 / 1024 / 1024) * 100) / 100;
      this._configRepository.save({id: 1, media_size: sizeInGb});
    });
  }

  private _findIntentsByMedia(media: MediaModel): Promise<Intent[]> {
    return this._intentsRepository.find({
      select: ['id', 'main_question', 'category'],
      join: {alias: 'intents', innerJoin: {responses: 'intents.responses'}},
      where: qb => {
        qb.where(`responses.response like '%/${encodeURI(media.file)}%'`)
      },
    });
  }

}
