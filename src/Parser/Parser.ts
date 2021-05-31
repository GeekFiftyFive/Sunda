export enum BooleanType {
  AND,
  OR,
  NONE
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
  IN = 'IN'
}

export enum ProjectionType {
  ALL
}

export interface Condition {
  boolean: BooleanType;
  comparison: Comparison;
  field: string;
  value: unknown;
  rhs?: Condition;
}

export interface Projection {
  type: ProjectionType;
  fields?: string[];
}

export interface Query {
  projection: Projection;
  table: string;
  condition?: Condition;
}

const parseCondition = (tokens: string[]): { condition: Condition, tokens: string[] } => {
  // TODO: This is extremely naive
  if (tokens.length < 3) {
    throw new Error('Invaluid condition in WHERE clause');
  }

  return {
    condition: {
      boolean: BooleanType.NONE,
      comparison: tokens[1] as Comparison,
      field: tokens[0],
      value: tokens[2],
    },
    tokens: tokens.slice(3),
  };
};

const parseProjection = (tokens: string[]): { projection: Projection, tokens: string[] } => {
  if (tokens[0] === '*') {
    return {
      projection: {
        type: ProjectionType.ALL,
      },
      tokens: tokens.slice(1),
    };
  }

  throw new Error('Projections not currently supported');
};

export const parse = (input: string[]): Query => {
  let query: Query;
  let projection: Projection;
  let tokens = input;

  if (tokens[0].toLowerCase() === 'select') {
    const parsed = parseProjection(tokens.splice(1));
    tokens = parsed.tokens;
    projection = parsed.projection;
  } else {
    throw new Error('Expected \'SELECT\'');
  }

  if (tokens[0].toLowerCase() === 'from') {
    tokens = tokens.slice(1);
    query = {
      projection,
      table: tokens[0],
    };
  } else {
    throw new Error('Expected \'FROM\'');
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
