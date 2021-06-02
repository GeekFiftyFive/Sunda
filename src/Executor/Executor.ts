import {
  BooleanType,
  Comparison,
  Condition,
  ConditionPair,
  isConditionPair,
  isSingularCondition,
  ProjectionType,
  Query,
  SingularCondition,
} from '../Parser';

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
  ) => value < expected.max && value > expected.min,
  LIKE: (value: string, expected: string) => value.includes(expected),
  IN: (value: unknown[], expected: unknown) => value.includes(expected),
};

const handleSingularCondition = (
  condition: SingularCondition,
  entry: Record<string, unknown>,
): boolean => {
  if (entry[condition.field] === undefined) {
    return false;
  }

  const comparison = comparisons[condition.comparison];

  return comparison(entry[condition.field], condition.value);
};

const handleConditionPair = (
  condition: ConditionPair,
  entry: Record<string, unknown>,
): boolean => {
  if (condition.boolean === BooleanType.AND) {
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.lhs, entry) && handleCondition(condition.rhs, entry);
  }

  if (condition.boolean === BooleanType.OR) {
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.lhs, entry) || handleCondition(condition.rhs, entry);
  }

  throw new Error('Only \'AND\' and \'OR\' supported at present!');
};

const handleCondition = (
  condition: Condition,
  entry: Record<string, unknown>,
): boolean => {
  if (isSingularCondition(condition)) {
    return handleSingularCondition(condition, entry);
  }

  if (isConditionPair(condition)) {
    return handleConditionPair(condition, entry);
  }

  throw new Error('Could not identify condition! There must be a parser bug!');
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

    return table.filter(
      (entry: Record<string, unknown>) => handleCondition(query.condition, entry),
    );
  }

  throw new Error('Projections not currently supported');
};
