export enum BooleanType {
  AND = 'AND',
  OR = 'OR',
  NONE = 'NONE',
  NOT = 'NOT',
}

export enum Comparison {
  EQ = '=',
  NEQ = '<>',
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  BETWEEN = 'BETWEEN',
  LIKE = 'LIKE',
  IN = 'IN',
}

export enum ProjectionType {
  ALL,
  SELECTED,
  DISTINCT,
}

export enum AggregateType {
  NONE,
  COUNT,
  SUM,
  AVG,
}

export interface Condition {
  boolean: BooleanType;
}

export interface SingularCondition extends Condition {
  comparison: Comparison;
  field: string;
  value: unknown;
}

export interface ConditionPair extends Condition {
  lhs: Condition;
  rhs: Condition;
}

export interface Projection {
  type: ProjectionType;
  fields?: string[];
}

export interface Query {
  projection: Projection;
  aggregation: AggregateType;
  table: string;
  condition?: Condition;
}

export const isSingularCondition = (object: Condition): object is SingularCondition =>
  'comparison' in object && 'field' in object && 'value' in object;

export const isConditionPair = (object: Condition): object is ConditionPair =>
  'lhs' in object && 'rhs' in object;

const parseValue = (value: string): unknown => {
  const numeric = Number.parseFloat(value);

  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  let regex = /"(.*)"/gm;
  let match = regex.exec(value);

  if (match) {
    return match[1];
  }

  regex = /'(.*)'/gm;
  match = regex.exec(value);

  if (match) {
    return match[1];
  }

  throw new Error(`Could not parse value ${value}`);
};

const indexOfCaseInsensitive = (value: string, arr: string[]): number => {
  const index = arr.indexOf(value.toUpperCase());
  return index >= 0 ? index : arr.indexOf(value.toLowerCase());
};

const parseCondition = (tokens: string[]): { condition: Condition; tokens: string[] } => {
  // TODO: This is extremely naive
  if (tokens.length < 3) {
    throw new Error('Invalid condition in WHERE clause');
  }

  const orIndex = indexOfCaseInsensitive('or', tokens);
  // TODO: Deduplicate
  if (orIndex >= 0) {
    const lhs = parseCondition(tokens.slice(0, orIndex)).condition;
    const rhs = parseCondition(tokens.slice(orIndex + 1)).condition;
    return {
      condition: {
        boolean: BooleanType.OR,
        lhs,
        rhs,
      } as ConditionPair,
      tokens: [], // FIXME: Actually properly figure out what's been consumed
    };
  }

  const andIndex = indexOfCaseInsensitive('and', tokens);

  if (andIndex >= 0) {
    const lhs = parseCondition(tokens.slice(0, andIndex)).condition;
    const rhs = parseCondition(tokens.slice(andIndex + 1)).condition;
    return {
      condition: {
        boolean: BooleanType.AND,
        lhs,
        rhs,
      } as ConditionPair,
      tokens: [], // FIXME: Actually properly figure out what's been consumed
    };
  }

  let boolean = BooleanType.NONE;
  let offset = 0;

  if (tokens[0].toLowerCase() === 'not') {
    boolean = BooleanType.NOT;
    offset = 1;
  }

  return {
    condition: {
      boolean,
      comparison: tokens[1 + offset] as Comparison,
      field: tokens[0 + offset],
      value: parseValue(tokens[2 + offset]),
    } as SingularCondition,
    tokens: tokens.slice(3 + offset),
  };
};

const parseSelection = (
  tokens: string[],
): { projection: Projection; aggregation: AggregateType; tokens: string[] } => {
  if (tokens[0] === '*') {
    return {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      tokens: tokens.slice(1),
    };
  }

  const aggregates: Record<string, AggregateType> = {
    count: AggregateType.COUNT,
    sum: AggregateType.SUM,
    avg: AggregateType.AVG,
  };

  if (Object.keys(aggregates).includes(tokens[0].toLowerCase())) {
    const lParenIdx = tokens.findIndex((token) => token === '(');
    const { projection, tokens: newTokens } = parseSelection(tokens.slice(lParenIdx + 1));
    return {
      projection,
      aggregation: aggregates[tokens[0].toLowerCase()],
      tokens: newTokens.slice(1),
    };
  }

  const type =
    tokens[0].toLowerCase() === 'distinct' ? ProjectionType.DISTINCT : ProjectionType.SELECTED;
  const offset = type === ProjectionType.DISTINCT ? 1 : 0;

  const fields: string[] = [];
  let consumedTokens = offset;

  while (
    tokens[consumedTokens].toLowerCase() !== 'from' &&
    tokens[consumedTokens].toLowerCase() !== ')'
  ) {
    if (consumedTokens % 2 === offset) {
      fields.push(tokens[consumedTokens]);
    } else if (tokens[consumedTokens] !== ',') {
      throw new Error('Remapping column names is not currently supported!');
    }
    consumedTokens += 1;
  }

  return {
    projection: {
      type,
      fields,
    },
    aggregation: AggregateType.NONE,
    tokens: tokens.slice(consumedTokens),
  };
};

export const parse = (input: string[]): Query => {
  let query: Query;
  let projection: Projection;
  let aggregation: AggregateType;
  let tokens = input;

  if (tokens.length === 0) {
    throw new Error("Expected 'SELECT'");
  }

  if (tokens[0].toLowerCase() === 'select') {
    ({ tokens, projection, aggregation } = parseSelection(tokens.splice(1)));
  } else {
    throw new Error("Expected 'SELECT'");
  }

  if (tokens[0].toLowerCase() === 'from') {
    tokens = tokens.slice(1);
    query = {
      projection,
      table: tokens[0],
      aggregation,
    };
  } else {
    throw new Error("Expected 'FROM'");
  }

  tokens = tokens.slice(1);

  if (tokens[0] && tokens[0].toLowerCase() === 'where') {
    const parsed = parseCondition(tokens.splice(1));
    tokens = parsed.tokens;
    query.condition = parsed.condition;
  }

  if (tokens.length !== 0 && tokens[0] !== ';') {
    throw new Error('Expected end of query');
  }

  return query;
};
