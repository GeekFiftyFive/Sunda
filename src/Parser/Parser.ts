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

export interface Join {
  table: string;
  alias?: string;
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
  joins: Join[];
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

  return {
    field: value,
  };
};

const indexOfCaseInsensitive = (value: string, arr: string[]): number => {
  const index = arr.indexOf(value.toUpperCase());
  return index >= 0 ? index : arr.indexOf(value.toLowerCase());
};

const isSet = (tokens: string[]): boolean => {
  if (tokens[0] !== '(') {
    return false;
  }

  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i] === ')') {
      return true;
    }

    if (i % 2 === 0 && tokens[i] !== ',') {
      return false;
    }
  }

  return false;
};

const parseSet = (tokens: string[]): { setValue: unknown[]; consumed: number } => {
  if (tokens[0] !== '(') {
    throw new Error('Not a valid set');
  }

  const toReturn = {
    setValue: [] as unknown[],
    consumed: 1,
  };

  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i] === ')') {
      toReturn.consumed += 1;
      break;
    }

    if (i % 2 === 0 && tokens[i] !== ',') {
      throw new Error('Not a valid set');
    }

    if (i % 2 === 1) {
      const value = parseValue(tokens[i]);
      toReturn.setValue.push(value);
    }

    toReturn.consumed += 1;
  }

  return toReturn;
};

const isInBracketedExpression = (
  index: number,
  bracketPairs: { start: number; end: number }[],
): boolean =>
  bracketPairs.reduce((toReturn, bracketPair) => {
    if (toReturn) {
      return toReturn;
    }

    return index > bracketPair.start && index < bracketPair.end;
  }, false);

const parseCondition = (tokens: string[]): { condition: Condition; tokens: string[] } => {
  // TODO: This is extremely naive
  if (tokens.length < 3) {
    throw new Error('Invalid condition in WHERE clause');
  }

  // Match brackets if there are any (and they are not part of an array)
  let bracketIndex = tokens.findIndex((token) => token === '(');
  const bracketPairs: { start: number; end: number }[] = [];

  if (bracketIndex > -1) {
    // Ensure bracket is not part of an array
    if (tokens[bracketIndex - 1] !== 'IN') {
      // Peek tokens and look for matching close bracket
      const brackets = [];
      do {
        if (bracketIndex >= tokens.length) {
          throw new Error('Could not find matching bracket pairs!');
        }

        if (tokens[bracketIndex] === '(') {
          brackets.push(bracketIndex);
        }

        if (tokens[bracketIndex] === ')') {
          const startIndex = brackets.pop();
          bracketPairs.push({
            start: startIndex,
            end: bracketIndex,
          });
        }
        bracketIndex += 1;
      } while (brackets.length > 0);
    }
  }

  const orIndex = tokens.reduce((orIndex, token, index) => {
    if (orIndex >= 0) {
      return orIndex;
    }
    if (token.toLowerCase() === 'or' && !isInBracketedExpression(index, bracketPairs)) {
      return index;
    }

    return orIndex;
  }, -1);
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

  const andIndex = tokens.reduce((andIndex, token, index) => {
    if (andIndex >= 0) {
      return andIndex;
    }
    if (token.toLowerCase() === 'and' && !isInBracketedExpression(index, bracketPairs)) {
      return index;
    }

    return andIndex;
  }, -1);

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

  const enclosingBracketPair = bracketPairs.find((pair) => pair.start === 0);

  if (enclosingBracketPair) {
    return parseCondition(tokens.slice(enclosingBracketPair.start + 1, enclosingBracketPair.end));
  }

  let boolean = BooleanType.NONE;
  let offset = 0;

  if (tokens[0].toLowerCase() === 'not') {
    boolean = BooleanType.NOT;
    offset = 1;
  }

  const valueIsSet = isSet(tokens.slice(2 + offset));
  let setValue: unknown[];
  let consumed = 1;

  if (valueIsSet) {
    const parsedSet = parseSet(tokens.slice(2 + offset));
    setValue = parsedSet.setValue;
    consumed = parsedSet.consumed;
  }

  return {
    condition: {
      boolean,
      comparison: tokens[1 + offset] as Comparison,
      field: tokens[0 + offset],
      value: valueIsSet ? setValue : parseValue(tokens[2 + offset]),
    } as SingularCondition,
    tokens: tokens.slice(2 + offset + consumed),
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

    const aggregation = aggregates[tokens[0].toLowerCase()];

    if (aggregation === AggregateType.AVG || aggregation === AggregateType.SUM) {
      if (projection.type === ProjectionType.ALL) {
        throw new Error(`Cannot use '${tokens[0].toUpperCase()}' aggregation with wildcard`);
      }

      if (projection.fields.length > 1) {
        throw new Error(
          `Cannot use '${tokens[0].toUpperCase()}' aggregation with multiple field names`,
        );
      }
    }

    return {
      projection,
      aggregation,
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

const parseJoins = (tokens: string[]): { joins: Join[]; tokens: string[] } => {
  // TODO: Extend
  if (tokens[2].toLowerCase() !== 'where' && tokens[2].toLowerCase() !== 'on') {
    throw new Error('Multiple joins and aliases not currently supported');
  }
  return {
    joins: [{ table: tokens[1] }],
    tokens: tokens.slice(2),
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
      joins: [],
    };
  } else {
    throw new Error("Expected 'FROM'");
  }

  tokens = tokens.slice(1);

  if (tokens[0] && tokens[0].toLowerCase() === 'join') {
    const { tokens: newTokens, joins } = parseJoins(tokens);
    tokens = newTokens;
    query = {
      ...query,
      joins,
    };
  }

  // TODO: Should be handled by parseJoins
  let joinCondition: Condition | undefined;

  if (tokens[0] && tokens[0].toLowerCase() === 'on') {
    joinCondition = parseCondition(tokens.slice(1, 4)).condition;
    tokens = tokens.splice(4);
  }

  if (tokens[0] && tokens[0].toLowerCase() === 'where') {
    const parsed = parseCondition(tokens.splice(1));
    tokens = parsed.tokens;

    if (!joinCondition) {
      query.condition = parsed.condition;
    } else {
      // TODO: Using 'on' and just joining on a value via the where clause have
      // slightly different behaviours, but here we are treating them the same.
      // This is OK for a first pass, but should be implemented properly at some point
      query.condition = {
        boolean: BooleanType.AND,
        lhs: joinCondition,
        rhs: parsed.condition,
      } as ConditionPair;
    }
  }

  if (tokens.length !== 0 && tokens[0] !== ';') {
    throw new Error('Expected end of query');
  }

  return query;
};
