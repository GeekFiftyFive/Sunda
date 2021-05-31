import { Comparison, ProjectionType, Query } from '../Parser';

export const execute = <T>(query: Query, data: Record<string, unknown[]>): T[] => {
  const table = data[query.table];

  if (!Array.isArray(table)) {
    throw new Error(`${query.table} is not an array!`);
  }

  if (query.projection.type === ProjectionType.ALL) {
    if (!query.condition) {
      return table as T[];
    }

    return table.filter((entry: Record<string, unknown>) => {
      if (entry[query.condition.field] === undefined) {
        return false;
      }

      return query.condition.comparison === Comparison.EQ
        && entry[query.condition.field] === query.condition.value;
    });
  }

  throw new Error('Projections not currently supported');
};
