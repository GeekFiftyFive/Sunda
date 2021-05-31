import { Comparison, ProjectionType, Query } from '../Parser';

const comparisons: Record<Comparison, (value: unknown, expected: unknown) => boolean> = {
  '=': (value: unknown, expected: unknown) => value === expected,
  '<>': (value: unknown, expected: unknown) => value !== expected,
  '>': (value: number, expected: number) => value > expected,
  '<': (value: number, expected: number) => value < expected,
  '>=': (value: number, expected: number) => value >= expected,
  '<=': (value: number, expected: number) => value <= expected,
  BETWEEN: (
    value: number,
    expected: { min: number, max: number },
  ) => value < expected.max && value > expected.max,
  LIKE: (value: string, expected: string) => value.includes(expected),
  IN: (value: unknown[], expected: unknown) => value.includes(expected),
};

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

      const comparison = comparisons[query.condition.comparison];

      return comparison(entry[query.condition.field], query.condition.value);
    });
  }

  throw new Error('Projections not currently supported');
};
