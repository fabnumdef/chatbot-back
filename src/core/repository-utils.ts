import { Repository } from "typeorm";

/**
 * Get the column names of a repository (including ones flagged as "select: false")
 */
export function getCols<T>(repository: Repository<T>): (keyof T)[] {
    return (repository.metadata.columns.map(col => col.propertyName) as (keyof T)[]);
}