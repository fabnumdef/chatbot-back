import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import * as escape from "pg-escape";

export class PaginationUtils {
  static setQuery(pagination: PaginationQueryDto,
                  attributes: string[],
                  entity?: string): any {
    const options: FindManyOptions = {};

    let queries = pagination && pagination.query ? pagination.query.trim().split(' ') : null;
    if (!!queries && queries.length > 0) {
      queries = queries.map(q => {
        return `%${q}%`;
      });
      options.where = '((';
      attributes.forEach((a, idx) => {
        options.where += idx > 0 ? ') or (' : '';
        queries.forEach((q, idxQuery) => {
          options.where += idxQuery > 0 ? ' and ' : '';
          options.where += escape(`upper(${entity ? entity + '.' : ''}%I) like %L`, a, q.toUpperCase());
        });
      });
      options.where += '))';
    }

    return options;
  }
}
