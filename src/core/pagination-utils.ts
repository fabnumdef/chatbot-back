import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import * as escape from "pg-escape";

export class PaginationUtils {
  static setQuery(pagination: PaginationQueryDto,
                              attributes: string[]): any {
    const options: FindManyOptions = {};

    const query = pagination.query ? `%${pagination.query.trim()}%` : null;
    if (!!query) {
      options.where = '(';
      attributes.forEach((a, idx) => {
        options.where += idx > 0 ? ' or ' : '';
        options.where += escape(`unaccent(upper(%I)) like unaccent(%L)`, a, query.toUpperCase());
      });
      options.where += ')';
    }

    return options;
  }
}
