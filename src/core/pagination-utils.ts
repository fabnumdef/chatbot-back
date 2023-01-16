import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import * as escape from "pg-escape";

export class PaginationUtils {
  static setQuery(pagination: PaginationQueryDto,
                  attributes: string[],
                  entity?: string): string {
    let whereClause = null;

    let queries = pagination && pagination.query ? pagination.query.trim().split(' ') : null;
    if (!!queries && queries.length > 0) {
      queries = queries.map(q => {
        return `%${q}%`;
      });
      whereClause = '((';
      attributes.forEach((a, idx) => {
        whereClause += idx > 0 ? ') or (' : '';
        queries.forEach((q, idxQuery) => {
          whereClause += idxQuery > 0 ? ' and ' : '';
          whereClause += escape(`upper(${entity ? entity + '.' : ''}%I) like %L`, a, q.toUpperCase());
        });
      });
      whereClause += '))';
    }

    return whereClause;
  }
}
