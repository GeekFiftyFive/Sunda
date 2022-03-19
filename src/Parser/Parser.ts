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

export enum FunctionName {
  FIND_IN_SET = 'FIND_IN_SET',
}

export enum DataSetType {
  TABLE,
  SUBQUERY,
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

export interface Value {
  type: 'FIELD' | 'LITERAL' | 'FUNCTION_RESULT';
}

export interface FieldValue extends Value {
  type: 'FIELD';
  fieldName: string;
}

export interface LiteralValue extends Value {
  type: 'LITERAL';
  value: unknown;
}

export interface FunctionResultValue extends Value {
  type: 'FUNCTION_RESULT';
  functionName: FunctionName;
  args: Value[];
}

export interface SingularCondition extends Condition {
  comparison: Comparison;
  lhs: Value;
  rhs: Value;
}

export interface ConditionPair extends Condition {
  lhs: Condition;
  rhs: Condition;
}

export interface Projection {
  type: ProjectionType;
  fields?: string[];
}

export interface DataSet {
  type: DataSetType;
  // eslint-disable-next-line no-use-before-define
  value: string | Query;
  alias?: string;
}

export interface Query {
  projection: Projection;
  aggregation: AggregateType;
  dataset: DataSet;
  joins: Join[];
  condition?: Condition;
}

export const isSingularCondition = (object: Condition): object is SingularCondition =>
  'comparison' in object && 'lhs' in object && 'rhs' in object;

export const isConditionPair = (object: Condition): object is ConditionPair =>
  'lhs' in object && 'rhs' in object;

const parseValue = (tokens: string[]): { value: Value; tokens: string[] } => {
  const numeric = Number.parseFloat(tokens[0]);

  if (!Number.isNaN(numeric)) {
    return {
      tokens: tokens.slice(1),
      value: { type: 'LITERAL', value: numeric } as LiteralValue,
    };
  }

  let regex = /"(.*)"/gm;
  let match = regex.exec(tokens[0]);

  if (match) {
    return {
      tokens: tokens.slice(1),
      value: { type: 'LITERAL', value: match[1] } as LiteralValue,
    };
  }

  regex = /'(.*)'/gm;
  match = regex.exec(tokens[0]);

  if (match) {
    return {
      tokens: tokens.slice(1),
      value: { type: 'LITERAL', value: match[1] } as LiteralValue,
    };
  }

  // eslint-disable-next-line no-use-before-define
  if (isSet(tokens)) {
    // eslint-disable-next-line no-use-before-define
    const setValue = parseSet(tokens);
    return {
      tokens: tokens.slice(setValue.consumed),
      value: { type: 'LITERAL', value: setValue.setValue } as LiteralValue,
    };
  }

  // FIXME: This feels kind of hacky :S
  return {
    tokens: tokens.slice(1),
    value: {
      type: 'FIELD',
      fieldName: tokens[0],
    } as FieldValue,
  };
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
      const value = parseValue(tokens.slice(i));
      if (value.value.type !== 'LITERAL') {
        throw new Error('Handling of non-literal values in sets not yet implemented');
      }
      toReturn.setValue.push((value.value as LiteralValue).value);
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

const firstUnbracketedIndex = (
  searchValue: string,
  tokens: string[],
  bracketPairs: { start: number; end: number }[],
) =>
  tokens.reduce((orIndex, token, index) => {
    if (orIndex >= 0) {
      return orIndex;
    }
    if (token.toLowerCase() === searchValue && !isInBracketedExpression(index, bracketPairs)) {
      return index;
    }

    return orIndex;
  }, -1);

const findBracketPairs = (tokens: string[]): { start: number; end: number }[] => {
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

  return bracketPairs;
};

const isFunctionResult = (tokens: string[]): boolean => {
  if (tokens.length < 2 || tokens[1] !== '(') {
    return false;
  }

  // FIXME: This check needs to be more exhaustive
  if (!/^\w+$/.test(tokens[0])) {
    return false;
  }

  const bracketedPairs = findBracketPairs(tokens);
  const outerBrackets = bracketedPairs.find((pairs) => pairs.start === 1);

  if (!outerBrackets) {
    return false;
  }

  return true;
};

/* TODO: More consistent return types from these parsers! Some return the rest of the token
  stream whilst others (such as this) return a count of the tokens consumed whilst parsing */
const parseFunctionResult = (
  tokens: string[],
): { functionResultValue: FunctionResultValue; consumed: number } => {
  const toReturn: { functionResultValue: FunctionResultValue; consumed: number } = {
    functionResultValue: {
      type: 'FUNCTION_RESULT',
      functionName: tokens[0] as FunctionName,
      args: [],
    },
    consumed: 1,
  };

  // TODO: De-dupe. This is very similar to what happens when we parse a set
  for (let i = 2; i < tokens.length; ) {
    if (tokens[i] === ')') {
      toReturn.consumed += 1;
      break;
    }

    if (i % 2 === 1 && tokens[i] !== ',') {
      throw new Error('Not a valid arguments list');
    }

    if (i % 2 === 0) {
      const value = parseValue(tokens.slice(i));
      const increment = tokens.length - i - value.tokens.length;
      i += increment;
      toReturn.consumed += increment;
      toReturn.functionResultValue.args.push(value.value);
    } else {
      i += 1;
      toReturn.consumed += 1;
    }
  }

  return toReturn;
};

const parseCondition = (tokens: string[]): { condition: Condition; tokens: string[] } => {
  // TODO: This is extremely naive
  if (tokens.length < 3) {
    throw new Error('Invalid condition in WHERE clause');
  }

  // Match brackets if there are any (and they are not part of an array)
  const bracketPairs = findBracketPairs(tokens);

  const orIndex = firstUnbracketedIndex('or', tokens, bracketPairs);
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

  const andIndex = firstUnbracketedIndex('and', tokens, bracketPairs);

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

  let lhs: Value = { type: 'FIELD', fieldName: tokens[0 + offset] } as FieldValue;

  const valueIsSet = isSet(tokens.slice(2 + offset));
  let setValue: unknown[];
  let consumed = 1;

  if (valueIsSet) {
    const parsedSet = parseSet(tokens.slice(2 + offset));
    setValue = parsedSet.setValue;
    consumed = parsedSet.consumed;
  }

  /* FIXME: These could probably be cleaner and cheaper if we simply try to parse
  the function result values and return undefined if the values are not function
  results */
  const leftHandValueIsFunctionResult = isFunctionResult(tokens);
  let leftHandfunctionResultValue: FunctionResultValue;

  if (leftHandValueIsFunctionResult) {
    const parsedFunctionResult = parseFunctionResult(tokens);
    leftHandfunctionResultValue = parsedFunctionResult.functionResultValue;
    consumed = parsedFunctionResult.consumed - offset - 1;
  }

  const rightHandValueIsFunctionResult = isFunctionResult(tokens.slice(consumed + 1));
  let rightHandfunctionResultValue: FunctionResultValue;

  if (rightHandValueIsFunctionResult) {
    const parsedFunctionResult = parseFunctionResult(tokens.slice(consumed + 1));
    rightHandfunctionResultValue = parsedFunctionResult.functionResultValue;
    consumed = parsedFunctionResult.consumed - offset - 1;
  }

  let rhs: Value;

  if (valueIsSet) {
    rhs = {
      type: 'LITERAL',
      value: setValue,
    } as LiteralValue;
  } else if (rightHandValueIsFunctionResult) {
    rhs = rightHandfunctionResultValue;
  } else if (leftHandValueIsFunctionResult) {
    lhs = leftHandfunctionResultValue;
    offset += consumed + 1;
    /* FIXME: Very hacky. Should breakout the logic to parse the righthand side instead of
    tricking it like this */
    const parsedRhs = parseCondition(['fakeToken', ...tokens.slice(1 + offset)]);
    consumed = tokens.length - (parsedRhs.tokens.length - 2);
    rhs = (parsedRhs.condition as SingularCondition).rhs;
  } else {
    const value = parseValue(tokens.slice(2 + offset));
    rhs = value.value;
  }

  return {
    condition: {
      boolean,
      comparison: tokens[1 + offset].toUpperCase() as Comparison,
      lhs,
      rhs,
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

const parseFrom = (tokens: string[]): { dataset: DataSet; tokens: string[] } => {
  let newTokens = tokens.slice(1);

  if (newTokens[0] === '(') {
    // Assume this is a sub-query
    const bracketPairs = findBracketPairs(newTokens);

    if (bracketPairs.length === 0) {
      throw new Error('Could not find matching end bracket');
    }

    const outerBracketPair = bracketPairs.find((bracketPair) => bracketPair.start === 0);

    if (!outerBracketPair) {
      throw new Error('Could not find matching end bracket');
    }

    // eslint-disable-next-line no-use-before-define
    const subquery = parse(newTokens.slice(outerBracketPair.start + 1, outerBracketPair.end));

    newTokens = newTokens.slice(outerBracketPair.end + 1);

    if (newTokens[0] !== 'as') {
      throw new Error('Expected an alias for subquery results');
    }

    return {
      tokens: newTokens.slice(1),
      dataset: {
        type: DataSetType.SUBQUERY,
        value: subquery,
        alias: newTokens[1],
      },
    };
  }

  // Assume this is just a table name
  // FIXME: Should have more error handling around this

  return { tokens: newTokens, dataset: { type: DataSetType.TABLE, value: newTokens[0] } };
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
    const parsedFrom = parseFrom(tokens);
    tokens = parsedFrom.tokens;
    query = {
      projection,
      dataset: parsedFrom.dataset,
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
