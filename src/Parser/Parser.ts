import { Token } from '../Tokeniser';
import {
  AggregateType,
  BooleanType,
  Comparison,
  Condition,
  ConditionPair,
  DataSet,
  DataSetType,
  ExpressionValue,
  FieldValue,
  FunctionName,
  FunctionResultValue,
  Join,
  LiteralValue,
  NumericOperation,
  Order,
  Ordering,
  Projection,
  ProjectionType,
  Query,
  SingularCondition,
  SubqueryValue,
  Value,
} from './types';

export const isFieldValue = (value: Value): value is FieldValue => value.type === 'FIELD';

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

const allUnbracketedIndexes = (
  searchValues: string[],
  tokens: string[],
  bracketedPairs: { start: number; end: number }[],
): number[] =>
  tokens
    .map((token, index) => {
      if (
        searchValues.includes(token.toLowerCase()) &&
        !isInBracketedExpression(index, bracketedPairs)
      ) {
        return index;
      }

      return undefined;
    })
    .filter((value) => value !== undefined);

const findBracketPairs = (
  tokens: string[],
  keepConsuming?: boolean,
): { start: number; end: number }[] => {
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
      } while ((brackets.length > 0 && !keepConsuming) || bracketIndex < tokens.length);
    }
  }

  return bracketPairs;
};

export const isSingularCondition = (object: Condition): object is SingularCondition =>
  'comparison' in object && 'lhs' in object && 'rhs' in object;

export const isConditionPair = (object: Condition): object is ConditionPair =>
  'lhs' in object && 'rhs' in object;

const parseNumericExpression = (
  tokens: string[],
): { value: Value; tokens: string[] } | undefined => {
  if (tokens.length === 2 && tokens[0] === NumericOperation.SUBTRACT && tokens[1] === '1') {
    return {
      value: {
        type: 'LITERAL',
        value: -1,
      } as LiteralValue,
      tokens: [],
    };
  }

  // eslint-disable-next-line no-param-reassign
  tokens = tokens
    .map((token, index) => {
      if (
        token === NumericOperation.SUBTRACT &&
        (index === 0 ||
          Object.values(NumericOperation).includes(tokens[index - 1] as NumericOperation))
      ) {
        return ['(', NumericOperation.SUBTRACT, '1', ')', NumericOperation.MULTIPLY];
      }

      return token;
    })
    .flat();

  const bracketedPairs = findBracketPairs(tokens, true);

  const unbracketedAddOrSubtract = allUnbracketedIndexes(['+', '-'], tokens, bracketedPairs);

  if (unbracketedAddOrSubtract.length > 0) {
    const groupedTokens: string[][] = [];

    let prevIndex = 0;
    unbracketedAddOrSubtract.forEach((index) => {
      if (index !== 0) {
        groupedTokens.push(tokens.slice(prevIndex, index));
      }
      prevIndex = index + 1;
      groupedTokens.push([tokens[index]]);
    });

    groupedTokens.push(tokens.slice(prevIndex));

    let remainingTokens: string[] = [];

    const chain = groupedTokens.map((group) => {
      if (
        group.length === 1 &&
        (group[0] === NumericOperation.ADD || group[0] === NumericOperation.SUBTRACT)
      ) {
        return group[0] as NumericOperation;
      }

      // eslint-disable-next-line no-use-before-define
      const parsed = parseValue(group);
      remainingTokens = parsed.tokens;
      return parsed.value;
    });

    return {
      value: {
        type: 'EXPRESSION',
        chain,
      } as ExpressionValue,
      tokens: remainingTokens,
    };
  }

  const unbracketedMultiply = firstUnbracketedIndex(['*'], tokens, bracketedPairs);

  if (unbracketedMultiply >= 0) {
    const remainingTokens = tokens.splice(unbracketedMultiply).slice(1);
    // eslint-disable-next-line no-use-before-define
    const parsedLhs = parseValue(tokens);
    // eslint-disable-next-line no-use-before-define
    const parsedRhs = parseValue(remainingTokens);

    return {
      value: {
        type: 'EXPRESSION',
        chain: [parsedLhs.value, NumericOperation.MULTIPLY, parsedRhs.value],
      } as ExpressionValue,
      tokens: parsedRhs.tokens,
    };
  }

  const unbracketedDivide = firstUnbracketedIndex(['/'], tokens, bracketedPairs);

  if (unbracketedDivide >= 0) {
    const remainingTokens = tokens.splice(unbracketedDivide).slice(1);
    // eslint-disable-next-line no-use-before-define
    const parsedLhs = parseValue(tokens);
    // eslint-disable-next-line no-use-before-define
    const parsedRhs = parseValue(remainingTokens);

    return {
      value: {
        type: 'EXPRESSION',
        chain: [parsedLhs.value, NumericOperation.DIVIDE, parsedRhs.value],
      } as ExpressionValue,
      tokens: parsedRhs.tokens,
    };
  }

  if (tokens[0] === '(' && tokens[tokens.length - 1] === ')') {
    // eslint-disable-next-line no-use-before-define
    return parseValue(tokens.splice(1, tokens.length - 2));
  }

  return undefined;
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

const mustBeSubquery = (tokens: string[]): boolean =>
  tokens.length > 2 && tokens[0] === '(' && tokens[1].toLowerCase() === 'select';

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

  let tokenIndex = 2;

  // TODO: De-dupe. This is very similar to what happens when we parse a set
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[tokenIndex] === ')') {
      toReturn.consumed += 1;
      break;
    }

    if (i % 2 === 1 && tokens[tokenIndex] !== ',') {
      throw new Error('Not a valid arguments list');
    }

    if (i % 2 === 0) {
      // eslint-disable-next-line no-use-before-define
      const value = parseValue(tokens.slice(tokenIndex));
      const increment = tokens.length - tokenIndex - value.tokens.length;
      tokenIndex += increment;
      toReturn.consumed += increment;
      toReturn.functionResultValue.args.push(value.value);
    } else {
      tokenIndex += 1;
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
      tokens: tokens.slice(parsedSet.consumed),
    };
  }

  if (mustBeSubquery(tokens)) {
    // TODO: Generalise this a bit better
    const bracketedPairs = findBracketPairs(tokens);
    const outermostPair = bracketedPairs.find((pair) => pair.start === 0);
    // eslint-disable-next-line no-use-before-define
    const subquery = parse(
      tokens.slice(1, outermostPair.end).map((token) => ({
        value: token,
        pos: [0, 0],
        line: 1,
      })),
    );
    return {
      value: { type: 'SUBQUERY', query: subquery } as SubqueryValue,
      tokens: tokens.slice(outermostPair.end + 1),
    };
  }

  const numericExpression = parseNumericExpression(tokens);

  if (numericExpression) {
    return numericExpression;
  }

  if (isFunctionResult(tokens)) {
    const parsedFunction = parseFunctionResult(tokens);
    return {
      value: parsedFunction.functionResultValue,
      tokens: tokens.slice(parsedFunction.consumed + 1),
    };
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

      if (projection.values.length > 1) {
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

  const values: Value[] = [];
  let remainingTokens = Array.from(tokens.slice(offset));
  let listIndex = 0;

  while (remainingTokens[0].toLowerCase() !== 'from' && remainingTokens[0].toLowerCase() !== ')') {
    if (listIndex % 2 === 0) {
      const parsedValue = parseValue(remainingTokens);
      values.push(parsedValue.value);
      remainingTokens = parsedValue.tokens;
    } else if (remainingTokens[0] === ',') {
      remainingTokens = remainingTokens.slice(1);
    } else {
      throw new Error('Remapping column names is not currently supported!');
    }
    listIndex += 1;
  }

  return {
    projection: {
      type,
      values,
    },
    aggregation: AggregateType.NONE,
    tokens: remainingTokens,
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
    const subquery = parse(
      newTokens.slice(outerBracketPair.start + 1, outerBracketPair.end).map((token) => ({
        value: token,
        pos: [0, 0],
        line: 1,
      })),
    );

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

const parseOrdering = (tokens: string[]): { ordering: Ordering; tokens: string[] } => {
  if (
    !(tokens[0].toLowerCase() === 'order' && tokens[1].toLowerCase() === 'by') &&
    tokens.length >= 3
  ) {
    // TODO: Better error messages!
    throw new Error('Invalid ordering!');
  }

  let order = Order.ASC;
  let consumedCount = 3;

  if (
    tokens.length > 3 &&
    (tokens[3].toUpperCase() === Order.ASC || tokens[3].toUpperCase() === Order.DESC)
  ) {
    order = tokens[3] as Order;
    consumedCount = 4;
  }

  return {
    tokens: tokens.slice(consumedCount),
    ordering: {
      order,
      field: tokens[2],
    },
  };
};

export const parse = (input: Token[]): Query => {
  let query: Query;
  let projection: Projection;
  let aggregation: AggregateType;
  let tokens = input.map((token) => token.value);

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

  const getTokensBetween = (tokens: string[]) => {
    let index = tokens.length;

    tokens.forEach((token, idx) => {
      if (['ORDER', 'LIMIT', 'OFFSET'].includes(token.toUpperCase())) {
        index = idx;
      }
    });

    return tokens.slice(0, index);
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (tokens[0] && tokens[0].toLowerCase() === 'order') {
      const parsed = parseOrdering(tokens);
      tokens = parsed.tokens;
      query.ordering = parsed.ordering;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (tokens[0] && tokens[0].toLowerCase() === 'limit') {
      if (tokens[1]) {
        const tokensToParse = getTokensBetween(tokens.slice(1));
        const parsed = parseValue(tokensToParse);
        tokens = tokens.slice(tokensToParse.length + 1);
        query.limitAndOffset = { limit: parsed.value, ...query.limitAndOffset };
        // eslint-disable-next-line no-continue
        continue;
      }
      throw new Error('Value required for limit!');
    }

    if (tokens[0] && tokens[0].toLowerCase() === 'offset') {
      if (tokens[1]) {
        const tokensToParse = getTokensBetween(tokens.slice(1));
        const parsed = parseValue(tokensToParse);
        tokens = tokens.slice(tokensToParse.length + 1);
        query.limitAndOffset = { offset: parsed.value, ...query.limitAndOffset };
        // eslint-disable-next-line no-continue
        continue;
      }
      throw new Error('Value required for offset!');
    }
    break;
  }

  if (tokens.length !== 0 && tokens[0] !== ';') {
    throw new Error('Expected end of query');
  }

  return query;
};
