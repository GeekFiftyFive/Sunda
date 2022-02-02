import { DataSource } from '../CommonTypes';
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
  IN: (value: unknown, expected: unknown[]) => expected.includes(value),
};

// TODO: This should be dealt with in the parser
export const followJsonPath = <T>(
  path: string,
  entry: Record<string, T> | Record<string, Record<string, T>> | undefined,
  tableName?: string,
): T => {
  const tokens = path.split('.');

  if (tokens.length === 1) {
    return (entry as Record<string, T>)[tokens[0]];
  }

  if (tokens[0] === tableName) {
    const rootLevelResolution = followJsonPath<T>(tokens.slice(1).join('.'), entry, tableName);
    if (rootLevelResolution) {
      return rootLevelResolution;
    }
  }

  const next = (entry as Record<string, Record<string, T>>)[tokens[0]];

  if (!next) {
    return undefined;
  }

  return followJsonPath<T>(tokens.slice(1).join('.'), next, tableName);
};

const assignSubValue = (target: Record<string, unknown>, tokens: string[], toAssign: unknown) => {
  if (tokens.length === 1) {
    // eslint-disable-next-line no-param-reassign
    target[tokens[0]] = toAssign;
  } else {
    if (!target[tokens[0]]) {
      // eslint-disable-next-line no-param-reassign
      target[tokens[0]] = {};
    }
    assignSubValue(target[tokens[0]] as Record<string, unknown>, tokens.slice(1), toAssign);
  }
};

const handleSingularCondition = (
  condition: SingularCondition,
  entry: Record<string, unknown>,
  tableName: string,
  joinTables: Record<string, unknown[]>,
): Record<string, unknown> | undefined => {
  const value = followJsonPath<unknown>(condition.field, entry, tableName);

  if (value === undefined) {
    return undefined;
  }

  const comparison = comparisons[condition.comparison.toUpperCase() as Comparison];
  const isJoin = typeof condition.value === 'object' && !Array.isArray(condition.value);
  let joinedTableName: string | undefined;
  let joinedEntry: Record<string, unknown> = {};

  if (typeof condition.value === 'object' && !Array.isArray(condition.value)) {
    // TODO: Need to improve typing surrounding comparison values to avoid this kind of mess
    // eslint-disable-next-line prefer-destructuring
    joinedTableName = (condition.value as { field: string }).field.split('.')[0];
    joinedEntry = joinTables[joinedTableName].find((joinedEntry) => {
      const joinValue = followJsonPath<unknown>(
        (condition.value as { field: string }).field,
        joinedEntry as Record<string, unknown>,
        joinedTableName,
      );

      return joinValue === value;
    }) as Record<string, unknown>;
  }

  const evaluated = comparison(value, condition.value);
  const fullEntry: Record<string, unknown> = joinedTableName
    ? { [tableName]: { ...entry }, [joinedTableName]: { ...joinedEntry } }
    : { ...entry };

  if (
    (condition.boolean === BooleanType.NOT && !evaluated) ||
    (condition.boolean !== BooleanType.NOT && evaluated) ||
    isJoin
  ) {
    return fullEntry;
  }

  return undefined;
};

const handleConditionPair = (
  condition: ConditionPair,
  entry: Record<string, unknown>,
  tableName: string,
  joinTables: Record<string, unknown[]>,
): Record<string, unknown> | undefined => {
  if (condition.boolean === BooleanType.AND) {
    // eslint-disable-next-line no-use-before-define
    const fullEntry = handleCondition(condition.lhs, entry, tableName, joinTables);
    if (!fullEntry) {
      return undefined;
    }
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.rhs, fullEntry, tableName, joinTables);
  }

  if (condition.boolean === BooleanType.OR) {
    // eslint-disable-next-line no-use-before-define
    const fullEntry = handleCondition(condition.lhs, entry, tableName, joinTables);
    if (fullEntry) {
      return fullEntry;
    }
    // eslint-disable-next-line no-use-before-define
    return handleCondition(condition.rhs, entry, tableName, joinTables);
  }

  throw new Error("Only 'AND' and 'OR' supported at present!");
};

const handleCondition = (
  condition: Condition,
  entry: Record<string, unknown>,
  tableName: string,
  joinTables: Record<string, unknown[]>,
): Record<string, unknown> | undefined => {
  if (isSingularCondition(condition)) {
    return handleSingularCondition(condition, entry, tableName, joinTables);
  }

  if (isConditionPair(condition)) {
    return handleConditionPair(condition, entry, tableName, joinTables);
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
        if (followJsonPath(field, entry) === followJsonPath(field, value)) {
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
        assignSubValue(newValue, field.split('.'), followJsonPath(field, entry));
      });
      values.push(newValue);
    }
  });

  return values as T[];
};

export const execute = async <T>(query: Query, datasource: DataSource): Promise<T[]> => {
  const maybeTable = await datasource.getTable(query.dataset.value as string);

  if (maybeTable.isEmpty()) {
    throw new Error(`${query.dataset.value as string} is not a valid table!`);
  }

  const table = await maybeTable.getValue().readFullTable();

  const joinTables = await query.joins
    .reduce(
      async (accPromise, join) => {
        const acc = await accPromise;
        const maybe = await datasource.getTable(join.table);

        if (maybe.isEmpty()) {
          throw new Error(`Could not satisfy join on table with name ${join.table}`);
        }

        acc[join.table] = await maybe.getValue().readFullTable();
        return acc;
      },
      new Promise<Record<string, unknown[]>>((resolve) => {
        resolve({});
      }),
    )
    .catch((err) => {
      throw err;
    });

  const filtered = !query.condition
    ? table
    : table
        .map((entry: Record<string, unknown>) =>
          handleCondition(query.condition, entry, query.dataset.value as string, joinTables),
        )
        .filter((entry: unknown) => !!entry);

  let output: unknown[];

  switch (query.projection.type) {
    case ProjectionType.ALL:
      output = filtered;
      break;
    case ProjectionType.SELECTED:
      output = filtered.map((value: Record<string, unknown>) => {
        const obj: Record<string, unknown> = {};
        query.projection.fields.forEach((field) => {
          const pathTokens = field.split('.');
          const fieldValue = followJsonPath(field, value);
          assignSubValue(obj, pathTokens, fieldValue);
        });
        return obj as T;
      });
      break;
    case ProjectionType.DISTINCT:
      output = distinct(query.projection.fields, filtered as Record<string, unknown>[]);
      break;
    default:
      throw new Error('Unsupported projection type');
  }

  switch (query.aggregation) {
    case AggregateType.COUNT:
      return [{ count: output.length } as unknown] as T[];
    case AggregateType.AVG:
    case AggregateType.SUM: {
      const sum = output.reduce((acc: number, current: Record<string, number>) => {
        const val = current[query.projection.fields[0]];

        if (typeof val !== 'number') {
          throw new Error(
            `Cannot use '${
              query.aggregation === AggregateType.SUM ? 'SUM' : 'AVG'
            }' on non numeric field`,
          );
        }

        return acc + val;
      }, 0) as number;

      if (query.aggregation === AggregateType.SUM) {
        return [{ sum }] as unknown as T[];
      }

      return [{ avg: sum / output.length }] as unknown as T[];
    }
    default:
      return output as T[];
  }
};
