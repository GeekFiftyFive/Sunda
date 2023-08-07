import { ReservedWords, Token } from '../Tokeniser';
import { TokenPointer } from './TokenPointer';
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
    if (searchValues.includes(token) && !isInBracketedExpression(index, bracketPairs)) {
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

const parseFunctionResult = (tp: TokenPointer): FunctionResultValue => {
  const toReturn: FunctionResultValue = {
    type: 'FUNCTION_RESULT',
    functionName: tp.getCurrentToken().value as FunctionName,
    args: [],
  };

  tp.movePointer(2);

  // TODO: De-dupe. This is very similar to what happens when we parse a set
  for (let i = 0; tp.length > 0; i += 1) {
    if (tp.getCurrentToken().value === ')') {
      break;
    }

    if (i % 2 === 1 && tp.getCurrentToken().value !== ',') {
      throw new Error('Not a valid arguments list');
    }

    if (i % 2 === 0) {
      // eslint-disable-next-line no-use-before-define
      const value = parseValue(tp.getRawTokens());
      const increment = tp.length - value.tokens.length;
      tp.movePointer(increment);
      toReturn.args.push(value.value);
    } else {
      tp.movePointer(1);
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
    const tp = new TokenPointer(
      tokens.map((token) => ({
        value: token,
        pos: [0, 0],
        line: 1,
      })),
    );
    const parsedFunction = parseFunctionResult(tp);
    return {
      value: parsedFunction,
      tokens: tp.getRawTokens().slice(1),
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

const parseCondition = (tp: TokenPointer): Condition => {
  const bracketedPairs = findBracketPairs(tp.getRawTokens());

  const unbracketedBoolean = firstUnbracketedIndex(
    [ReservedWords.AND, ReservedWords.OR],
    tp.getRawTokens(),
    bracketedPairs,
  );

  if (unbracketedBoolean >= 0) {
    const boolean: BooleanType = tp.peek(unbracketedBoolean).value as BooleanType;

    const parsedLhs = parseCondition(tp.createSegment(0, unbracketedBoolean));
    tp.movePointer(unbracketedBoolean + 1);
    const parsedRhs = parseCondition(tp);

    return {
      boolean,
      lhs: parsedLhs,
      rhs: parsedRhs,
    } as ConditionPair;
  }

  const unbracketedNot = firstUnbracketedIndex(
    [ReservedWords.NOT],
    tp.getRawTokens(),
    bracketedPairs,
  );

  if (unbracketedNot >= 0) {
    const condition = parseCondition(tp.movePointer(1));
    condition.boolean = BooleanType.NOT;
    return condition;
  }

  const unbracketedComparison = firstUnbracketedIndex(
    Object.values(Comparison),
    tp.getRawTokens(),
    bracketedPairs,
  );

  if (unbracketedComparison >= 0) {
    const comparison: Comparison = tp.peek(unbracketedComparison).value as Comparison;

    const parsedLhsValue = parseValue(tp.createSegment(0, unbracketedComparison).getRawTokens());
    tp.movePointer(unbracketedComparison + 1);
    const parsedRhsValue = parseValue(tp.getRawTokens());
    tp.movePointer(tp.getTokens().length - (parsedRhsValue.tokens.length + 1));

    return {
      boolean: BooleanType.NONE,
      comparison,
      lhs: parsedLhsValue.value,
      rhs: parsedRhsValue.value,
    } as SingularCondition;
  }

  // If we find ourselves here, the entire expression is in brackets
  const condition = parseCondition(tp.createSegment(1, tp.length - 1));
  tp.movePointer(tp.length - 1);
  return condition;
};

const parseSelection = (
  tp: TokenPointer,
): { projection: Projection; aggregation: AggregateType } => {
  if (tp.getCurrentToken().value === '*') {
    tp.movePointer(1);
    return {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
    };
  }

  const aggregates: Record<string, AggregateType> = {
    COUNT: AggregateType.COUNT,
    SUM: AggregateType.SUM,
    AVG: AggregateType.AVG,
  };

  if (Object.keys(aggregates).includes(tp.getCurrentToken().value)) {
    const aggregationStr = tp.getCurrentToken().value;
    const aggregation = aggregates[tp.getCurrentToken().value];
    const lParenIdx = tp.getRawTokens().findIndex((token) => token === '(');
    const { projection } = parseSelection(tp.movePointer(lParenIdx + 1));

    if (aggregation === AggregateType.AVG || aggregation === AggregateType.SUM) {
      if (projection.type === ProjectionType.ALL) {
        throw new Error(`Cannot use '${aggregationStr}' aggregation with wildcard`);
      }

      if (projection.values.length > 1) {
        throw new Error(`Cannot use '${aggregationStr}' aggregation with multiple field names`);
      }
    }

    tp.movePointer(1);

    return {
      projection,
      aggregation,
    };
  }
  if (tp.peek(1).value === '(') {
    // Attempt to parse a function call
    const functionResultValue = parseFunctionResult(tp);
    tp.movePointer(1);
    return {
      projection: {
        type: ProjectionType.FUNCTION,
        function: functionResultValue,
      },
      aggregation: AggregateType.NONE,
    };
  }

  const type =
    tp.getCurrentToken().value === ReservedWords.DISTINCT
      ? ProjectionType.DISTINCT
      : ProjectionType.SELECTED;
  const offset = type === ProjectionType.DISTINCT ? 1 : 0;

  tp.movePointer(offset);

  const values: Value[] = [];
  let listIndex = 0;

  while (tp.getCurrentToken().value !== ReservedWords.FROM && tp.getCurrentToken().value !== ')') {
    if (listIndex % 2 === 0) {
      const parsedValue = parseValue(tp.getRawTokens());
      const tokensConsumed = tp.getTokens().length - parsedValue.tokens.length;
      values.push(parsedValue.value);
      tp.movePointer(tokensConsumed);
    } else if (tp.getCurrentToken().value === ',') {
      tp.movePointer(1);
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
  };
};

const parseJoins = (tp: TokenPointer): Join[] => {
  // TODO: Extend
  if (tp.peek(3).value !== ReservedWords.WHERE && tp.peek(3).value !== ReservedWords.ON) {
    throw new Error('Multiple joins and aliases not currently supported');
  }
  const joins = [{ table: tp.peek(2).value }];
  tp.movePointer(2);
  return joins;
};

const parseFrom = (tp: TokenPointer): DataSet => {
  tp.movePointer(1);

  if (tp.getCurrentToken().value === '(') {
    // Assume this is a sub-query
    const bracketPairs = findBracketPairs(tp.getRawTokens());

    if (bracketPairs.length === 0) {
      throw new Error('Could not find matching end bracket');
    }

    const outerBracketPair = bracketPairs.find((bracketPair) => bracketPair.start === 0);

    if (!outerBracketPair) {
      throw new Error('Could not find matching end bracket');
    }

    // eslint-disable-next-line no-use-before-define
    const subquery = parse(
      tp.createSegment(outerBracketPair.start + 1, outerBracketPair.end).getTokens(),
    );

    tp.movePointer(outerBracketPair.end + 1);

    if (tp.getCurrentToken().value !== ReservedWords.AS) {
      throw new Error('Expected an alias for subquery results');
    }

    return {
      type: DataSetType.SUBQUERY,
      value: subquery,
      alias: tp.movePointer(1).getCurrentToken().value,
    };
  }

  // Assume this is just a table name
  // FIXME: Should have more error handling around this
  return { type: DataSetType.TABLE, value: tp.getCurrentToken().value };
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
  const tp = new TokenPointer(input);

  if (tp.length === 0) {
    throw new Error("Expected 'SELECT'");
  }

  if (tp.getCurrentToken().value === ReservedWords.SELECT) {
    ({ projection, aggregation } = parseSelection(tp.movePointer(1)));
  } else {
    throw new Error("Expected 'SELECT'");
  }

  if (tp.getCurrentToken().value === ReservedWords.FROM) {
    const dataset = parseFrom(tp);
    query = {
      projection,
      dataset,
      aggregation,
      joins: [],
    };
  } else {
    throw new Error("Expected 'FROM'");
  }

  if (tp.peek(1)?.value === ReservedWords.JOIN) {
    const joins = parseJoins(tp);
    query = {
      ...query,
      joins,
    };
  }

  // TODO: Should be handled by parseJoins
  let joinCondition: Condition | undefined;

  if (tp.peek(1)?.value === ReservedWords.ON) {
    joinCondition = parseCondition(tp.createSegment(2, 5));
    tp.movePointer(4);
  }

  if (tp.peek(1)?.value === ReservedWords.WHERE) {
    const condition = parseCondition(tp.movePointer(2));

    if (!joinCondition) {
      query.condition = condition;
    } else {
      // TODO: Using 'on' and just joining on a value via the where clause have
      // slightly different behaviours, but here we are treating them the same.
      // This is OK for a first pass, but should be implemented properly at some point
      query.condition = {
        boolean: BooleanType.AND,
        lhs: joinCondition,
        rhs: condition,
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

    return index;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (tp.peek(1)?.value === ReservedWords.ORDER) {
      const parsed = parseOrdering(tp.movePointer(1).getRawTokens());
      const consumed = tp.getTokens().length - (parsed.tokens.length + 1);
      tp.movePointer(consumed);
      query.ordering = parsed.ordering;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (tp.peek(1)?.value === ReservedWords.LIMIT) {
      if (tp.peek(2)) {
        const tokensToParse = getTokensBetween(tp.movePointer(2).getRawTokens());
        const parsed = parseValue(tp.createSegment(0, tokensToParse).getRawTokens());
        tp.movePointer(tokensToParse - 1);
        query.limitAndOffset = { limit: parsed.value, ...query.limitAndOffset };
        // eslint-disable-next-line no-continue
        continue;
      }
      throw new Error('Value required for limit!');
    }

    if (tp.peek(1)?.value === ReservedWords.OFFSET) {
      if (tp.peek(2)) {
        const tokensToParse = getTokensBetween(tp.movePointer(2).getRawTokens());
        const parsed = parseValue(tp.createSegment(0, tokensToParse).getRawTokens());
        tp.movePointer(tokensToParse - 1);
        query.limitAndOffset = { offset: parsed.value, ...query.limitAndOffset };
        // eslint-disable-next-line no-continue
        continue;
      }
      throw new Error('Value required for offset!');
    }
    break;
  }

  if (tp.peek(1) && tp.peek(1).value !== ';') {
    throw new Error('Expected end of query');
  }

  return query;
};
