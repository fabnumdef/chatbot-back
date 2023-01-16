import { PaginationQueryDto } from "@core/dto/pagination-query.dto";
import { FindManyOptions } from "typeorm/find-options/FindManyOptions";
import * as escape from "pg-escape";

export class PaginationUtils {
  /**
   * Formatage de la clause Where lors du filtrage par pagination
   * Récupération de la query et formatage de la clause avec les attributs possible à filtrer (OR)
   * On splitte la query à chaque espace afin de pouvoir chercher les mots indépendamments
   * @param pagination
   * @param attributes
   * @param entity
   */
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
