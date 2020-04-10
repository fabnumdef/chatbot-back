import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, Repository } from "typeorm";
import { Media } from "@core/entities/media.entity";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";

@Injectable()
export class MediaService {

  private _filesDirectory = path.resolve(__dirname, '../../mediatheque');

  constructor(@InjectRepository(Media)
              private readonly _mediasRepository: Repository<Media>) {
    // Create folder if it does not exists
    mkdirp(this._filesDirectory);
  }

  findAll(params = {}): Promise<Media[]> {
    return this._mediasRepository.find(params);
  }

  findOne(id: number): Promise<Media> {
    return this._mediasRepository.findOne(id);
  }

  findOneWithParam(param: any): Promise<Media> {
    return this._mediasRepository.findOne(param);
  }

  async create(file: any): Promise<Media> {
    const fileName = escape(file.originalname.trim());
    const fileExists = await this.findOneWithParam({file: fileName});
    if (fileExists) {
      throw new HttpException('Un média avec le même nom existe déjà.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    fs.writeFileSync(path.resolve(this._filesDirectory, fileName), file.buffer);
    return this._mediasRepository.save({file: fileName});
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
