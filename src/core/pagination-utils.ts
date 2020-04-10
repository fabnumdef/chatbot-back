import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import { Like } from "typeorm";

export class PaginationUtils {
  static setPaginationOptions(pagination: PaginationQueryDto, attributes: string[]): any {
    const options: FindManyOptions = {};

    const query = pagination.query.trim();
    if (!!query) {
      options['where'] = {};
      attributes.forEach(a => {
        options.where[a] = Like(`%${query}%`);
      })
    }

    return options;
  }
}
