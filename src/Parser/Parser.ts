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
  ARRAY_POSITION = 'ARRAY_POSITION',
}

export enum DataSetType {
  TABLE,
  SUBQUERY,
}

export enum ProjectionType {
  ALL,
  SELECTED,
  DISTINCT,
  FUNCTION,
}

export enum AggregateType {
  NONE,
  COUNT,
  SUM,
  AVG,
}

export enum NumericOperation {
  MULTIPLY = '*',
  DIVIDE = '/',
  ADD = '+',
  SUBTRACT = '-',
}

export interface Join {
  table: string;
  alias?: string;
}

export interface Condition {
  boolean: BooleanType;
}

export interface Value {
  type: 'FIELD' | 'LITERAL' | 'FUNCTION_RESULT' | 'EXPRESSION';
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

export interface ExpressionValue extends Value {
  type: 'EXPRESSION';
  lhs: Value;
  rhs: Value;
  operation: NumericOperation;
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
  function?: FunctionResultValue;
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

const parseNumericExpression = (tokens: string[]): { value: ExpressionValue; tokens: string[] } =>
  // This function makes the assumption that tokens already begins with a valid numeric expression
  // TODO: Flesh this out
  ({
    value: {
      type: 'EXPRESSION',
      operation: tokens[1] as NumericOperation,
      // eslint-disable-next-line no-use-before-define
      lhs: parseValue([tokens[0]]).value,
      // eslint-disable-next-line no-use-before-define
      rhs: parseValue([tokens[2]]).value,
    },
    tokens: tokens.slice(3),
  });

const isNumericExpression = (tokens: string[]): boolean => {
  // Consume characters until we encounter a comparison
  let valid = true;
  let previousValue: 'LITERAL' | 'FIELD' | 'OPERATION' | undefined;
  let current: string;
  let i = 0;

  if (tokens.length < 3) {
    return false;
  }

  // TODO: Bracketed expressions and function results
  do {
    current = tokens[i];
    i += 1;
    // TODO: parseFloat allows some invalid numeric values to parse.
    // This validation should be made more rigorous
    if (!Number.isNaN(parseFloat(current))) {
      if (previousValue !== 'OPERATION' && previousValue !== undefined) {
        valid = false;
        break;
      }
      previousValue = 'LITERAL';
    } else if (Object.values(NumericOperation).includes(current as NumericOperation)) {
      if (previousValue !== 'LITERAL' && previousValue !== 'FIELD') {
        valid = false;
        break;
      }
      previousValue = 'OPERATION';
    } else if (/^[a-zA-Z][a-zA-Z|_|0-9]*$/gm.exec(current)) {
      previousValue = 'FIELD';
    } else {
      return false;
    }
  } while (!Object.values(Comparison).includes(current as Comparison) && i < tokens.length);

  return valid;
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
      // eslint-disable-next-line no-use-before-define
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
  searchValues: string[],
  tokens: string[],
  bracketPairs: { start: number; end: number }[],
) =>
  tokens.reduce((orIndex, token, index) => {
    if (orIndex >= 0) {
      return orIndex;
    }
    if (
      searchValues.includes(token.toLowerCase()) &&
      !isInBracketedExpression(index, bracketPairs)
    ) {
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
      // eslint-disable-next-line no-use-before-define
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

const parseValue = (tokens: string[]): { value: Value; tokens: string[] } => {
  if (isSet(tokens)) {
    const parsedSet = parseSet(tokens);
    return {
      value: { type: 'LITERAL', value: parsedSet.setValue } as LiteralValue,
      tokens: tokens.slice(parsedSet.consumed + 1),
    };
  }

  if (isFunctionResult(tokens)) {
    const parsedFunction = parseFunctionResult(tokens);
    return {
      value: parsedFunction.functionResultValue,
      tokens: tokens.slice(parsedFunction.consumed + 1),
    };
  }

  // Check if it is a numeric expression
  // eslint-disable-next-line no-use-before-define
  if (isNumericExpression(tokens)) {
    // eslint-disable-next-line no-use-before-define
    return parseNumericExpression(tokens);
  }

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

  if (tokens[0] === 'true') {
    return {
      tokens: tokens.slice(1),
      value: { type: 'LITERAL', value: true } as LiteralValue,
    };
  }

  if (tokens[0] === 'false') {
    return {
      tokens: tokens.slice(1),
      value: { type: 'LITERAL', value: false } as LiteralValue,
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

  return {
    tokens: tokens.slice(1),
    value: {
      type: 'FIELD',
      fieldName: tokens[0],
    } as FieldValue,
  };
};

const parseCondition = (tokens: string[]): { condition: Condition; tokens: string[] } => {
  const bracketedPairs = findBracketPairs(tokens);

  const unbracketedBoolean = firstUnbracketedIndex(['and', 'or'], tokens, bracketedPairs);

  if (unbracketedBoolean >= 0) {
    const boolean: BooleanType = tokens[unbracketedBoolean].toUpperCase() as BooleanType;

    const remainingTokens = tokens.splice(unbracketedBoolean).slice(1);
    const parsedLhs = parseCondition(tokens);
    const parsedRhs = parseCondition(remainingTokens);

    return {
      condition: {
        boolean,
        lhs: parsedLhs.condition,
        rhs: parsedRhs.condition,
      } as ConditionPair,
      tokens: parsedRhs.tokens,
    };
  }

  const unbracketedNot = firstUnbracketedIndex(['not'], tokens, bracketedPairs);

  if (unbracketedNot >= 0) {
    const parsed = parseCondition(tokens.slice(1));
    parsed.condition.boolean = BooleanType.NOT;
    return parsed;
  }

  const unbracketedComparison = firstUnbracketedIndex(
    Object.values(Comparison).map((comparison) => comparison.toLowerCase()),
    tokens,
    bracketedPairs,
  );

  if (unbracketedComparison >= 0) {
    const comparison: Comparison = tokens[unbracketedComparison].toUpperCase() as Comparison;

    const remainingTokens = tokens.splice(unbracketedComparison).slice(1);
    const parsedLhsValue = parseValue(tokens);
    const parsedRhsValue = parseValue(remainingTokens);

    return {
      condition: {
        boolean: BooleanType.NONE,
        comparison,
        lhs: parsedLhsValue.value,
        rhs: parsedRhsValue.value,
      } as SingularCondition,
      tokens: parsedRhsValue.tokens,
    };
  }

  // If we find ourselves here, the entire expression is in brackets
  return parseCondition(tokens.splice(1, tokens.length - 2));
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
  if (tokens[1] === '(') {
    // Attempt to parse a function call
    const { functionResultValue, consumed } = parseFunctionResult(tokens);
    return {
      projection: {
        type: ProjectionType.FUNCTION,
        function: functionResultValue,
      },
      aggregation: AggregateType.NONE,
      tokens: tokens.slice(consumed + 1),
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
