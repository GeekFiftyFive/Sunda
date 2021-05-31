export enum ProjectionType {
  ALL
}

export interface Projection {
  type: ProjectionType;
  fields?: string[];
}

export interface Query {
  projection: Projection;
  table: string;
}

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

  if (tokens[0] === 'SELECT') {
    const parsed = parseProjection(tokens.splice(1));
    tokens = parsed.tokens;
    projection = parsed.projection;
  } else {
    throw new Error('Expected \'SELECT\'');
  }

  if (tokens[0] === 'FROM') {
    tokens = tokens.slice(1);
    query = {
      projection,
      table: tokens[0],
    };
  } else {
    throw new Error('Expected \'FROM\'');
  }

  tokens = tokens.slice(1);

  if (tokens.length !== 0) {
    throw new Error('Expected end of query');
  }

  return query;
};
