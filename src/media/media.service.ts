import { PaginationQueryDto } from '@core/dto/pagination-query.dto';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';
import { Intent } from '@core/entities/intent.entity';
import { Media } from '@core/entities/media.entity';
import { User } from '@core/entities/user.entity';
import { IntentStatus } from '@core/enums/intent-status.enum';
import { IntentModel } from '@core/models/intent.model';
import { MediaModel } from '@core/models/media.model';
import PaginationUtils from '@core/pagination-utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import * as path from 'path';
import { Brackets, DeleteResult, FindOneOptions, Repository } from 'typeorm';
import BotLogger from '../logger/bot.logger';
import ResponseService from '../response/response.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const getSize = require('get-folder-size');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');

@Injectable()
export default class MediaService {
  private filesDirectory = process.env.MEDIA_DIR ?? path.resolve(__dirname, '../../mediatheque');

  private readonly logger = new BotLogger('MediaService');

  constructor(
    @InjectRepository(Media)
    private readonly mediasRepository: Repository<Media>,
    private readonly responseService: ResponseService,
    @InjectRepository(ChatbotConfig)
    private readonly configRepository: Repository<ChatbotConfig>,
    @InjectRepository(Intent)
    private readonly intentsRepository: Repository<Intent>,
  ) {
    // Création du répertoire si il n'existe pas
    mkdirp(this.filesDirectory).then();
  }

  /**
   * Récupération de tous les médias
   * @param params
   */
  findAll(params = {}): Promise<Media[]> {
    return this.mediasRepository.find(params);
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
          const intents = await this.findIntentsByMedia(item);
          // eslint-disable-next-line no-param-reassign
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
    const query = this.mediasRepository
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
    return this.mediasRepository.findOne({ where: { id } });
  }

  /**
   * Récupération d'un média selon une clause
   * @param param
   */
  findOneWithParam(param: FindOneOptions): Promise<Media> {
    return this.mediasRepository.findOne(param);
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
    const stats = fs.statSync(path.resolve(this.filesDirectory, fileName));
    const fileToSave: Media = {
      id: existFile ? existFile.id : null,
      file: fileName,
      // poids du média en KB
      size: Math.round(stats.size / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
    };
    return this.mediasRepository.save(fileToSave);
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
      fs.unlinkSync(path.resolve(this.filesDirectory, oldFile.file));
    } catch (e) {
      this.logger.error(`Error unlinking old file`, e);
    }
    // Ecriture sur le serveur du nouveau média
    fs.writeFileSync(path.resolve(this.filesDirectory, fileName), file.buffer);
    this.updateMediaSize();
    const stats = fs.statSync(path.resolve(this.filesDirectory, fileName));
    const fileToSave: Media = {
      id: mediaId,
      file: fileName,
      // size in KB
      size: Math.round(stats.size / 1000),
      added_by: `${user.first_name} ${user.last_name}`,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      created_at: new Date(),
    };
    const mediaUpdated = await this.mediasRepository.save(fileToSave);

    // Mise à jour des réponses qui contenaient l'ancien média
    await this.responseService.updateFileResponses(
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
      path.resolve(this.filesDirectory, oldFile.file),
      path.resolve(this.filesDirectory, fileName),
    );
    await this.mediasRepository.update({ id: mediaId }, { file: fileName });
    const mediaUpdated = await this.findOne(mediaId);

    // Mise à jour des réponses qui contenaient l'ancien média
    await this.responseService.updateFileResponses(
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
    } catch (e) {
      /* empty */
    }
    return this.mediasRepository.delete(id);
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
    fs.writeFileSync(path.resolve(this.filesDirectory, fileName), file.buffer);
    this.updateMediaSize();
    return fileName;
  }

  /**
   * Suppression d'un fichier sur le serveur
   * @param filePath
   */
  async deleteFile(filePath: string) {
    fs.unlinkSync(path.resolve(this.filesDirectory, filePath));
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
      const filePath = path.resolve(this.filesDirectory, m.file);
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
  private updateMediaSize() {
    getSize(this.filesDirectory, (err, sizeInB) => {
      const sizeInGb = Math.round((sizeInB / 1024 / 1024 / 1024) * 100) / 100;
      this.configRepository.save({ id: 1, media_size: sizeInGb });
    });
  }

  /**
   * Récupération des connaissances liées à un média
   * @param media
   * @private
   */
  private findIntentsByMedia(media: MediaModel): Promise<Intent[]> {
    return this.intentsRepository
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
