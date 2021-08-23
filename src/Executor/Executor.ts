import {
  AggregateType,
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
  BETWEEN: (value: number, expected: { min: number; max: number }) =>
    value < expected.max && value > expected.min,
  LIKE: (value: string, expected: string) => {
    const regex = `^${expected
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/gm, '.*')
      .replace(/_/gm, '.')}$`;
    return new RegExp(regex).test(value);
  },
  IN: (value: unknown[], expected: unknown) => value.includes(expected),
};

export const followJsonPath = <T>(
  path: string,
  entry: Record<string, T> | Record<string, Record<string, T>> | undefined,
): T => {
  const tokens = path.split('.');

  if (tokens.length === 1) {
    return (entry as Record<string, T>)[tokens[0]];
  }

  const next = (entry as Record<string, Record<string, T>>)[tokens[0]];

  if (!next) {
    return undefined;
  }

  return followJsonPath<T>(tokens.slice(1).join('.'), next);
};

const handleSingularCondition = (
  condition: SingularCondition,
  entry: Record<string, unknown>,
): boolean => {
  const value = followJsonPath<unknown>(condition.field, entry);

  if (value === undefined) {
    return false;
  }

  const comparison = comparisons[condition.comparison.toUpperCase() as Comparison];
  const evaluated = comparison(value, condition.value);

  return condition.boolean === BooleanType.NOT ? !evaluated : evaluated;
};

const handleConditionPair = (condition: ConditionPair, entry: Record<string, unknown>): boolean => {
  if (condition.boolean === BooleanType.AND) {
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.lhs, entry) && handleCondition(condition.rhs, entry);
  }

  if (condition.boolean === BooleanType.OR) {
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.lhs, entry) || handleCondition(condition.rhs, entry);
  }

  throw new Error("Only 'AND' and 'OR' supported at present!");
};

const handleCondition = (condition: Condition, entry: Record<string, unknown>): boolean => {
  if (isSingularCondition(condition)) {
    return handleSingularCondition(condition, entry);
  }

  if (isConditionPair(condition)) {
    return handleConditionPair(condition, entry);
  }

  throw new Error('Could not identify condition! There must be a parser bug!');
};

const distinct = <T>(fields: string[], data: Record<string, unknown>[]): T[] => {
  const values: Record<string, unknown>[] = [];

  // TODO: This is pretty naive and could do with optimisation and cleaning up
  data.forEach((entry) => {
    let unique = true;

    values.forEach((value) => {
      let matches = 0;
      fields.forEach((field) => {
        if (entry[field] === value[field]) {
          matches += 1;
        }
      });
      if (matches === fields.length) {
        unique = false;
      }
    });

    if (unique) {
      const newValue: Record<string, unknown> = {};
      fields.forEach((field) => {
        newValue[field] = entry[field];
      });
      values.push(newValue);
    }
  });

  return values as T[];
};

export const execute = <T>(query: Query, data: Record<string, unknown[]>): T[] => {
  const table = data[query.table];

  if (!Array.isArray(table)) {
    throw new Error(`${query.table} is not an array!`);
  }

  const filtered = !query.condition
    ? table
    : table.filter((entry: Record<string, unknown>) => handleCondition(query.condition, entry));

  let output: unknown[];

  switch (query.projection.type) {
    case ProjectionType.ALL:
      output = filtered;
      break;
    case ProjectionType.SELECTED:
      output = filtered.map((value: Record<string, unknown>) => {
        const obj: Record<string, unknown> = {};
        query.projection.fields.forEach((field) => {
          obj[field] = value[field];
        });
        return obj as T;
      });
      break;
    case ProjectionType.DISTINCT:
      output = distinct(query.projection.fields, filtered);
      break;
    default:
      throw new Error('Unsupported projection type');
  }

  if (query.aggregation === AggregateType.COUNT) {
    return [{ count: output.length } as unknown] as T[];
  }

  return output as T[];
};
