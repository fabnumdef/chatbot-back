import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import { Media } from '@core/entities/media.entity';
import * as path from 'path';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { PaginationUtils } from '@core/pagination-utils';
import { User } from '@core/entities/user.entity';
import { MediaModel } from '@core/models/media.model';
import { plainToInstance } from 'class-transformer';
import { IntentModel } from '@core/models/intent.model';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { Response } from 'express';
import { Intent } from '@core/entities/intent.entity';
import { IntentStatus } from '@core/enums/intent-status.enum';
import { BotLogger } from '../logger/bot.logger';
import { ResponseService } from '../response/response.service';

const getSize = require('get-folder-size');
const archiver = require('archiver');

@Injectable()
export class MediaService {
  private _filesDirectory = path.resolve(__dirname, '../../mediatheque');

  private readonly _logger = new BotLogger('MediaService');

  constructor(
    @InjectRepository(Media)
    private readonly _mediasRepository: Repository<Media>,
    private readonly _responseService: ResponseService,
    @InjectRepository(ChatbotConfig)
    private readonly _configRepository: Repository<ChatbotConfig>,
    @InjectRepository(Intent)
    private readonly _intentsRepository: Repository<Intent>,
  ) {
    // Création du répertoire si il n'existe pas
    mkdirp(this._filesDirectory).then();
  }

  /**
   * Récupération de tous les médias
   * @param params
   */
  findAll(params = {}): Promise<Media[]> {
    return this._mediasRepository.find(params);
  }

  /**
   * Récupération des médias paginés
   * @param options
   */
  async paginate(options: PaginationQueryDto): Promise<Pagination<MediaModel>> {
    const results = await paginate(
      this.getMediaQueryBuilder(
        PaginationUtils.setQuery(options, Media.getAttributesToSearch()),
      ),
      options,
    );

    // Récupération des connaissances liées
    return new Pagination(
      await Promise.all(
        results.items.map(async (item: MediaModel) => {
          const intents = await this._findIntentsByMedia(item);
          item.intents = plainToInstance(IntentModel, intents);

          return item;
        }),
      ),
      results.meta,
      results.links,
    );
  }

  /**
   * Création de la requête SQL pour récupérer les médias
   * @param whereClause
   */
  getMediaQueryBuilder(whereClause: string) {
    const query = this._mediasRepository
      .createQueryBuilder('media')
      .where(whereClause ? whereClause.toString() : `'1'`)
      .addOrderBy('media.created_at', 'DESC');

    return query;
  }

  /**
   * Récupération d'un média
   * @param id
   */
  findOne(id: number): Promise<Media> {
    return this._mediasRepository.findOne({ where: { id } });
  }

  /**
   * Récupération d'un média selon une clause
   * @param param
   */
  findOneWithParam(param: FindOneOptions): Promise<Media> {
    return this._mediasRepository.findOne(param);
  }

  /**
   * Création d'un média
   * @param file
   * @param user
   */
  async create(file: any, user: User): Promise<Media> {
    const fileName = await this.storeFile(file, true);
    const existFile = await this.findOneWithParam({
      where: { file: fileName },
    });
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: existFile ? existFile.id : null,
      file: fileName,
      // poids du média en KB
      size: Math.round(stats.size / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
    };
    return this._mediasRepository.save(fileToSave);
  }

  /**
   * Mise à jour d'un média
   * @param mediaId
   * @param file
   * @param user
   */
  async update(mediaId: number, file: any, user: User): Promise<Media> {
    const fileName = encodeURI(file.originalname.trim());
    if (fileName.length > 255) {
      throw new HttpException(
        'Le nom du fichier ne doit pas dépasser 255 caractères.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const fileExists = await this.findOneWithParam({
      where: { file: fileName },
    });
    if (fileExists && fileExists.id !== mediaId) {
      throw new HttpException(
        'Un média avec le même nom existe déjà.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const oldFile = await this.findOne(mediaId);
    try {
      // Suppression sur le serveur de l'ancien média
      fs.unlinkSync(path.resolve(this._filesDirectory, oldFile.file));
    } catch (e) {
      this._logger.error(`Error unlinking old file`, e);
    }
    // Ecriture sur le serveur du nouveau média
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    this._updateMediaSize();
    const stats = fs.statSync(path.resolve(this._filesDirectory, fileName));
    const fileToSave: Media = {
      id: mediaId,
      file: fileName,
      // size in KB
      size: Math.round(stats.size / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
      // @ts-ignore
      created_at: new Date(),
    };
    const mediaUpdated = await this._mediasRepository.save(fileToSave);

    // Mise à jour des réponses qui contenaient l'ancien média
    await this._responseService.updateFileResponses(
      oldFile.file,
      mediaUpdated.file,
    );

    return mediaUpdated;
  }

  /**
   * Edition du nom d'un méda
   * @param mediaId
   * @param fileName
   */
  async edit(mediaId: number, fileName: string): Promise<Media> {
    if (fileName.length > 255) {
      throw new HttpException(
        'Le nom du fichier ne doit pas dépasser 255 caractères.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const fileExists = await this.findOneWithParam({
      where: { file: fileName },
    });
    if (fileExists && fileExists.id !== mediaId) {
      throw new HttpException(
        'Un média avec le même nom existe déjà.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const oldFile = await this.findOne(mediaId);
    fs.renameSync(
      path.resolve(this._filesDirectory, oldFile.file),
      path.resolve(this._filesDirectory, fileName),
    );
    await this._mediasRepository.update({ id: mediaId }, { file: fileName });
    const mediaUpdated = await this.findOne(mediaId);

    // Mise à jour des réponses qui contenaient l'ancien média
    await this._responseService.updateFileResponses(
      oldFile.file,
      mediaUpdated.file,
    );

    return mediaUpdated;
  }

  /**
   * Suppression d'un média
   * @param id
   */
  async delete(id: number): Promise<DeleteResult> {
    const fileExists = await this.findOne(id);
    if (!fileExists) {
      throw new HttpException(
        "Ce média n'existe pas.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      this.deleteFile(fileExists.file);
    } catch (e) {}
    return this._mediasRepository.delete(id);
  }

  /**
   * Suppression de plusieurs médias
   * @param ids
   */
  async deleteMultiples(ids: number[]) {
    const promises = [];
    ids.forEach((id) => {
      promises.push(this.delete(id));
    });
    return Promise.all(promises);
  }

  /**
   * Stockage d'un fichier qui n'est pas un média
   * @param file
   * @param replaceIfExists
   */
  async storeFile(file, replaceIfExists = false): Promise<string> {
    const fileName = encodeURI(file.originalname.trim());
    if (fileName.length > 255) {
      throw new HttpException(
        'Le nom du fichier ne doit pas dépasser 255 caractères.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const fileExists = await this.findOneWithParam({
      where: { file: fileName },
    });
    if (fileExists && !replaceIfExists) {
      throw new HttpException(
        'Un média avec le même nom existe déjà.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    this._updateMediaSize();
    return fileName;
  }

  /**
   * Suppression d'un fichier sur le serveur
   * @param filePath
   */
  async deleteFile(filePath: string) {
    fs.unlinkSync(path.resolve(this._filesDirectory, filePath));
  }

  /**
   * Export de la médiathèque en .zip
   * @param res
   */
  async export(res: Response) {
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // set the archive name
    res.attachment('MEDIATHEQUE.zip');

    // this is the streaming magic
    archive.pipe(res);
    const medias = await this.findAll();
    medias.forEach((m: Media) => {
      const filePath = path.resolve(this._filesDirectory, m.file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: encodeURI(m.file) });
      }
    });
    archive.finalize();
  }

  /** ********************************************************************************** STATIC *********************************************************************************** */

  /**
   * Vérification de l'extension des médias
   * @param req
   * @param file
   * @param callback
   */
  static mediaFilter = (req, file, callback) => {
    if (
      !file.originalname
        .toLowerCase()
        .match(
          /\.(gif|jpg|jpeg|png|ppt|pptx|odp|xls|xlsx|ods|csv|pdf|doc|odt|txt)$/,
        )
    ) {
      return callback(
        new HttpException(
          'Seules les extensions suivantes sont autorisées: gif, jpg, jpeg, png, ppt, pptx, odp, xls, xlsx, ods, csv, pdf, doc, odt, txt.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
    return callback(null, true);
  };

  /**
   * Mise à jour de la taille totale occupée par la médiathèque sur le serveur
   * @private
   */
  private _updateMediaSize() {
    getSize(this._filesDirectory, (err, sizeInB) => {
      const sizeInGb = Math.round((sizeInB / 1024 / 1024 / 1024) * 100) / 100;
      this._configRepository.save({ id: 1, media_size: sizeInGb });
    });
  }

  /**
   * Récupération des connaissances liées à un média
   * @param media
   * @private
   */
  private _findIntentsByMedia(media: MediaModel): Promise<Intent[]> {
    return this._intentsRepository
      .createQueryBuilder('intent')
      .select(['intent.id', 'intent.main_question', 'intent.category'])
      .innerJoin('intent.responses', 'responses')
      .where(
        new Brackets((qb) => {
          qb.where(
            `responses.response like '%/${media.file.replaceAll(`'`, `''`)}%'`,
          );
          qb.andWhere('intent.status IN (:...status)', {
            status: [
              IntentStatus.to_deploy,
              IntentStatus.active,
              IntentStatus.active_modified,
              IntentStatus.in_training,
            ],
          });
        }),
      )
      .getMany();
  }
}
