import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import { escape } from "sqlstring";

export class PaginationUtils {
  static setQuery(pagination: PaginationQueryDto,
                              attributes: string[]): any {
    const options: FindManyOptions = {};

    const query = pagination.query ? escape(`%${pagination.query.trim()}%`) : null;
    if (!!pagination.query.trim()) {
      options.where = '(';
      attributes.forEach((a, idx) => {
        options.where += idx > 0 ? ' or ' : '';
        options.where += `upper(${a}) like ${query.toUpperCase()}`;
      });
      options.where += ')';
    }

    return options;
  }
}
