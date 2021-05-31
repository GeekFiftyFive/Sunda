import { ProjectionType, Query } from '../Parser';

export const execute = <T>(query: Query, data: Record<string, unknown[]>): T[] => {
  const table = data[query.table];

  if (query.projection.type === ProjectionType.ALL) {
    return table as T[];
  }

  throw new Error('Projections not currently supported');
};
