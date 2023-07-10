import { FunctionName } from '.';
import {
  AggregateType,
  BooleanType,
  Comparison,
  DataSetType,
  NumericOperation,
  Order,
  ParserError,
  ProjectionType,
} from './types';
import { parse } from './Parser';
import { Token } from '../Tokeniser';

interface ExtractedParserError {
  message: string;
  pos: [number, number];
  suggestion?: string;
}

// TODO: Find a nicer way of doing this
const addSpanInfo = (tokens: string[]): Token[] =>
  tokens.map((token) => ({
    value: token,
    pos: [0, 0],
    line: 1,
  }));

const extractParserError = (error: ParserError): ExtractedParserError => ({
  message: error.message,
  pos: error.pos,
  suggestion: error.suggestion,
});

describe('test parser', () => {
  test('parse simple valid query', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test('parse valid query with simple where clause', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'field', '=', '"value"', ';'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        lhs: { type: 'FIELD', fieldName: 'field' },
        rhs: { type: 'LITERAL', value: 'value' },
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parse valid query with single quotes', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'field', '=', '"value"', ';'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        lhs: { type: 'FIELD', fieldName: 'field' },
        rhs: { type: 'LITERAL', value: 'value' },
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parser should parse numeric values', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'field', '=', '10', ';'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        lhs: { type: 'FIELD', fieldName: 'field' },
        rhs: { type: 'LITERAL', value: 10 },
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parser should handle "and" in the where clause', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'AND',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field1' },
          rhs: { type: 'LITERAL', value: 10 },
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field2' },
          rhs: { type: 'LITERAL', value: 'value' },
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test('parser should handle "or" in the where clause', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'OR',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.OR,
        lhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field1' },
          rhs: { type: 'LITERAL', value: 10 },
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field2' },
          rhs: { type: 'LITERAL', value: 'value' },
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test('parser should handle "and" and "or" in the where clause', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'OR',
      'field2',
      'LIKE',
      '"value"',
      'AND',
      'field3',
      '>=',
      '8',
      ';',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.OR,
        lhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field1' },
          rhs: { type: 'LITERAL', value: 10 },
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.AND,
          lhs: {
            boolean: BooleanType.NONE,
            lhs: { type: 'FIELD', fieldName: 'field2' },
            rhs: { type: 'LITERAL', value: 'value' },
            comparison: Comparison.LIKE,
          },
          rhs: {
            boolean: BooleanType.NONE,
            lhs: { type: 'FIELD', fieldName: 'field3' },
            rhs: { type: 'LITERAL', value: 8 },
            comparison: Comparison.GTE,
          },
        },
      },
      joins: [],
    });
  });

  test('parser should handle "not" in the where clause', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'NOT', 'field1', '=', '10'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NOT,
        lhs: { type: 'FIELD', fieldName: 'field1' },
        rhs: { type: 'LITERAL', value: 10 },
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parser should handle "not" and "and" in the where clause', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'NOT',
      'field1',
      '=',
      '10',
      'AND',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NOT,
          lhs: { type: 'FIELD', fieldName: 'field1' },
          rhs: { type: 'LITERAL', value: 10 },
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          lhs: { type: 'FIELD', fieldName: 'field2' },
          rhs: { type: 'LITERAL', value: 'value' },
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test('parser should handle projections', () => {
    const tokens = ['SELECT', 'name', ',', 'age', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.SELECTED,
          values: [
            {
              type: 'FIELD',
              fieldName: 'name',
            },
            {
              type: 'FIELD',
              fieldName: 'age',
            },
          ],
        },
        joins: [],
      }),
    );
  });

  test('parser should handle "distinct" keyword', () => {
    const tokens = ['SELECT', 'DISTINCT', 'name', ',', 'age', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.DISTINCT,
          values: [
            {
              type: 'FIELD',
              fieldName: 'name',
            },
            {
              type: 'FIELD',
              fieldName: 'age',
            },
          ],
        },
        joins: [],
      }),
    );
  });

  test('parse can handle a function inside of a "distinct"', () => {
    const tokens = [
      'SELECT',
      'DISTINCT',
      'REGEX_GROUP',
      '(',
      '"^Hello, (\\w*)(!)$"',
      ',',
      'name',
      ',',
      '1',
      ')',
      ',',
      'age',
      'FROM',
      'tableName',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.DISTINCT,
          values: [
            {
              type: 'FUNCTION_RESULT',
              functionName: 'REGEX_GROUP',
              args: [
                {
                  type: 'LITERAL',
                  value: '^Hello, (\\w*)(!)$',
                },
                {
                  type: 'FIELD',
                  fieldName: 'name',
                },
                {
                  type: 'LITERAL',
                  value: 1,
                },
              ],
            },
            {
              type: 'FIELD',
              fieldName: 'age',
            },
          ],
        },
        joins: [],
      }),
    );
  });

  test('parse simple "count" aggregation', () => {
    const tokens = ['SELECT', 'COUNT', '(', '*', ')', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.COUNT,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test('parser should handle distinct "count" aggregate function', () => {
    const tokens = ['SELECT', 'COUNT', '(', 'DISTINCT', 'colour', ')', 'FROM', 'furniture'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.DISTINCT,
          values: [
            {
              type: 'FIELD',
              fieldName: 'colour',
            },
          ],
        },
        aggregation: AggregateType.COUNT,
        joins: [],
      }),
    );
  });

  test('parse simple "sum" aggregation', () => {
    const tokens = ['SELECT', 'SUM', '(', 'fieldName', ')', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        values: [
          {
            type: 'FIELD',
            fieldName: 'fieldName',
          },
        ],
      },
      aggregation: AggregateType.SUM,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test('parse simple "avg" aggregation', () => {
    const tokens = ['SELECT', 'AVG', '(', 'fieldName', ')', 'FROM', 'tableName'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        values: [
          {
            type: 'FIELD',
            fieldName: 'fieldName',
          },
        ],
      },
      aggregation: AggregateType.AVG,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test('parse simple join using where condition', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'JOIN',
      'users',
      'WHERE',
      'posts.PosterID',
      '=',
      'users.ID',
      'AND',
      'users.Name',
      '=',
      '"George"',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'posts.PosterID' },
          rhs: {
            type: 'FIELD',
            fieldName: 'users.ID',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'users.Name' },
          rhs: { type: 'LITERAL', value: 'George' },
        },
      },
      joins: [{ table: 'users' }],
    });
  });

  test('can parse join with no constraint on joined table', () => {
    const tokens = [
      'SELECT',
      'DISTINCT',
      'users.Name',
      'FROM',
      'posts',
      'JOIN',
      'users',
      'WHERE',
      'posts.PosterID',
      '=',
      'users.ID',
      'AND',
      'posts.Views',
      '>=',
      '10',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.DISTINCT,
        values: [
          {
            type: 'FIELD',
            fieldName: 'users.Name',
          },
        ],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'posts.PosterID' },
          rhs: {
            type: 'FIELD',
            fieldName: 'users.ID',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.GTE,
          lhs: { type: 'FIELD', fieldName: 'posts.Views' },
          rhs: { type: 'LITERAL', value: 10 },
        },
      },
      joins: [{ table: 'users' }],
    });
  });

  test('parse simple join using "on"', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'JOIN',
      'users',
      'ON',
      'posts.PosterID',
      '=',
      'users.ID',
      'WHERE',
      'users.Name',
      '=',
      '"George"',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'posts.PosterID' },
          rhs: { type: 'FIELD', fieldName: 'users.ID' },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'users.Name' },
          rhs: { type: 'LITERAL', value: 'George' },
        },
      },
      joins: [{ table: 'users' }],
    });
  });

  test('parse subfield in select statement', () => {
    const tokens = [
      'SELECT',
      'address.line1',
      'FROM',
      'users',
      'WHERE',
      'address.line1',
      '=',
      '"123 Street Lane"',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        values: [
          {
            type: 'FIELD',
            fieldName: 'address.line1',
          },
        ],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'address.line1' },
        rhs: { type: 'LITERAL', value: '123 Street Lane' },
      },
      joins: [],
    });
  });

  test('parse subfield in distinct statement', () => {
    const tokens = [
      'SELECT',
      'DISTINCT',
      'address.line1',
      'FROM',
      'users',
      'WHERE',
      'address.line1',
      '=',
      '"123 Street Lane"',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.DISTINCT,
        values: [
          {
            type: 'FIELD',
            fieldName: 'address.line1',
          },
        ],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'address.line1' },
        rhs: { type: 'LITERAL', value: '123 Street Lane' },
      },
      joins: [],
    });
  });
});

describe('test parsing "IN" operator', () => {
  test('parse in operator with numeric values', () => {
    const tokens = ['SELECT', '*', 'FROM', 'posts', 'WHERE', 'ID', 'IN', '(', '1', ',', '3', ')'];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.IN,
        lhs: { type: 'FIELD', fieldName: 'ID' },
        rhs: { type: 'LITERAL', value: [1, 3] },
      },
      joins: [],
    });
  });

  test('parse in operator with string values', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'Title',
      'IN',
      '(',
      '"Hello, world"',
      ',',
      '"Goodbye all!"',
      ')',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.IN,
        lhs: { type: 'FIELD', fieldName: 'Title' },
        rhs: { type: 'LITERAL', value: ['Hello, world', 'Goodbye all!'] },
      },
      joins: [],
    });
  });
});

describe('test parsing brackets', () => {
  test('parse simple expression containing bracketed condition', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      '(',
      'Title',
      '=',
      '"Goodbye all!"',
      'OR',
      'Title',
      '=',
      '"Hello, world"',
      ')',
      'AND',
      'Views',
      '>',
      '10',
    ];
    const query = parse(addSpanInfo(tokens));

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.OR,
          lhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'Title' },
            rhs: { type: 'LITERAL', value: 'Goodbye all!' },
          },
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'Title' },
            rhs: { type: 'LITERAL', value: 'Hello, world' },
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.GT,
          lhs: { type: 'FIELD', fieldName: 'Views' },
          rhs: { type: 'LITERAL', value: 10 },
        },
      },
      joins: [],
    });
  });

  test('parse more complex expression with nested brackets', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'Title',
      '=',
      '"Goodbye all!"',
      'OR',
      '(',
      '(',
      'Value',
      'IN',
      '(',
      '1',
      ',',
      '2',
      ')',
      'AND',
      'Views',
      '>',
      '10',
      ')',
      'OR',
      'ID',
      '=',
      '10',
      ')',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.OR,
        lhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          lhs: { type: 'FIELD', fieldName: 'Title' },
          rhs: { type: 'LITERAL', value: 'Goodbye all!' },
        },
        rhs: {
          boolean: BooleanType.OR,
          lhs: {
            boolean: BooleanType.AND,
            lhs: {
              boolean: BooleanType.NONE,
              comparison: Comparison.IN,
              lhs: { type: 'FIELD', fieldName: 'Value' },
              rhs: { type: 'LITERAL', value: [1, 2] },
            },
            rhs: {
              boolean: BooleanType.NONE,
              comparison: Comparison.GT,
              lhs: { type: 'FIELD', fieldName: 'Views' },
              rhs: { type: 'LITERAL', value: 10 },
            },
          },
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'ID' },
            rhs: { type: 'LITERAL', value: 10 },
          },
        },
      },
      joins: [],
    });
  });
});

describe('test parser handles subqueries', () => {
  test('parse basic subquery', () => {
    const tokens = [
      'SELECT',
      'u.age',
      'FROM',
      '(',
      'SELECT',
      '*',
      'FROM',
      'users',
      ')',
      'AS',
      'u',
      'WHERE',
      'u.age',
      '>',
      '21',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        values: [
          {
            type: 'FIELD',
            fieldName: 'u.age',
          },
        ],
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.SUBQUERY,
        alias: 'u',
        value: {
          projection: {
            type: ProjectionType.ALL,
          },
          aggregation: AggregateType.NONE,
          dataset: {
            type: DataSetType.TABLE,
            value: 'users',
          },
          joins: [],
        },
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: { type: 'FIELD', fieldName: 'u.age' },
        rhs: { type: 'LITERAL', value: 21 },
      },
      joins: [],
    });
  });

  test('parse subquery containing brackets', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      '(',
      'SELECT',
      '*',
      'FROM',
      'users',
      'WHERE',
      'name',
      'IN',
      '(',
      '"Fred"',
      ',',
      '"Sammy"',
      ')',
      ')',
      'AS',
      'u',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.SUBQUERY,
        alias: 'u',
        value: {
          projection: {
            type: ProjectionType.ALL,
          },
          aggregation: AggregateType.NONE,
          dataset: {
            type: DataSetType.TABLE,
            value: 'users',
          },
          condition: {
            boolean: BooleanType.NONE,
            comparison: Comparison.IN,
            lhs: { type: 'FIELD', fieldName: 'name' },
            rhs: { type: 'LITERAL', value: ['Fred', 'Sammy'] },
          },
          joins: [],
        },
      },
      joins: [],
    });
  });

  test('parse use of subquery passed to IN', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'cats',
      'WHERE',
      'name',
      'IN',
      '(',
      'SELECT',
      'name',
      'FROM',
      'cats',
      ')',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'cats' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.IN,
        lhs: { type: 'FIELD', fieldName: 'name' },
        rhs: {
          type: 'SUBQUERY',
          query: {
            projection: {
              type: ProjectionType.SELECTED,
              values: [
                {
                  type: 'FIELD',
                  fieldName: 'name',
                },
              ],
            },
            aggregation: AggregateType.NONE,
            dataset: { type: DataSetType.TABLE, value: 'cats' },
            joins: [],
          },
        },
      },
      joins: [],
    });
  });
});

describe('test parser handlers functions', () => {
  test('parse basic query containing function', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      'names',
      ',',
      '"Fred"',
      ')',
      '>',
      '0',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'posts',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'FIELD',
              fieldName: 'names',
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
          ],
        },
        rhs: {
          type: 'LITERAL',
          value: 0,
        },
      },
      joins: [],
    });
  });

  test('parse basic query containing function on rhs of condition', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      'names',
      ',',
      '"Fred"',
      ')',
      '>',
      'ARRAY_POSITION',
      '(',
      'names',
      ',',
      '"Barry"',
      ')',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'posts',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'FIELD',
              fieldName: 'names',
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
          ],
        },
        rhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'FIELD',
              fieldName: 'names',
            },
            {
              type: 'LITERAL',
              value: 'Barry',
            },
          ],
        },
      },
      joins: [],
    });
  });

  test('can parse sets being passed to a function', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      '(',
      '"Fred"',
      ',',
      '"Sammy"',
      ')',
      ',',
      '"Fred"',
      ')',
      '>',
      '0',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'posts',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'LITERAL',
              value: ['Fred', 'Sammy'],
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
          ],
        },
        rhs: {
          type: 'LITERAL',
          value: 0,
        },
      },
      joins: [],
    });
  });

  test('can parse empty sets being passed to a function', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      '(',
      ')',
      ',',
      '"Fred"',
      ')',
      '>',
      '0',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'posts',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'LITERAL',
              value: [],
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
          ],
        },
        rhs: {
          type: 'LITERAL',
          value: 0,
        },
      },
      joins: [],
    });
  });

  test('can parse more than two arguments passed to function', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      '(',
      '"Fred"',
      ',',
      '"Sammy"',
      ')',
      ',',
      '"Fred"',
      ',',
      '1',
      ')',
      '>',
      '0',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'posts',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'FUNCTION_RESULT',
          functionName: 'ARRAY_POSITION',
          args: [
            {
              type: 'LITERAL',
              value: ['Fred', 'Sammy'],
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
            {
              type: 'LITERAL',
              value: 1,
            },
          ],
        },
        rhs: {
          type: 'LITERAL',
          value: 0,
        },
      },
      joins: [],
    });
  });

  test('can parse a function given in the "SELECT" statement', () => {
    const tokens = [
      'SELECT',
      'ARRAY_POSITION',
      '(',
      'aliases',
      ',',
      '"Fred"',
      ')',
      'FROM',
      'posts',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.FUNCTION,
        function: {
          type: 'FUNCTION_RESULT',
          functionName: FunctionName.ARRAY_POSITION,
          args: [
            {
              type: 'FIELD',
              fieldName: 'aliases',
            },
            {
              type: 'LITERAL',
              value: 'Fred',
            },
          ],
        },
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      joins: [],
    });
  });

  test('can parse boolean values', () => {
    let tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', 'value', '=', 'true'];

    let actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'value' },
        rhs: { type: 'LITERAL', value: true },
      },
      joins: [],
    });

    tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', 'value', '=', 'false'];

    actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'value' },
        rhs: { type: 'LITERAL', value: false },
      },
      joins: [],
    });
  });

  test('can parse basic arithmetic expressions using multiply', () => {
    const tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', 'value', '*', '2', '>', '5'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            { type: 'FIELD', fieldName: 'value' },
            NumericOperation.MULTIPLY,
            { type: 'LITERAL', value: 2 },
          ],
        },
        rhs: { type: 'LITERAL', value: 5 },
      },
      joins: [],
    });
  });

  test('can parse basic arithmetic expressions using addition', () => {
    const tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', 'value', '+', '2', '=', '5'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            { type: 'FIELD', fieldName: 'value' },
            NumericOperation.ADD,
            { type: 'LITERAL', value: 2 },
          ],
        },
        rhs: { type: 'LITERAL', value: 5 },
      },
      joins: [],
    });
  });

  test('can parse basic arithmetic expressions using addition and subtraction', () => {
    const tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', '2', '-', 'value', '+', '2', '=', '5'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            { type: 'LITERAL', value: 2 },
            NumericOperation.SUBTRACT,
            { type: 'FIELD', fieldName: 'value' },
            NumericOperation.ADD,
            { type: 'LITERAL', value: 2 },
          ],
        },
        rhs: { type: 'LITERAL', value: 5 },
      },
      joins: [],
    });
  });

  test('can parse basic arithmetic expressions using function calls', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'table',
      'WHERE',
      'ARRAY_POSITION',
      '(',
      'CommentorIDs',
      ',',
      '2',
      ')',
      '/',
      '2',
      '=',
      '1',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            {
              type: 'FUNCTION_RESULT',
              functionName: 'ARRAY_POSITION',
              args: [
                { type: 'FIELD', fieldName: 'CommentorIDs' },
                { type: 'LITERAL', value: 2 },
              ],
            },
            NumericOperation.DIVIDE,
            { type: 'LITERAL', value: 2 },
          ],
        },
        rhs: { type: 'LITERAL', value: 1 },
      },
      joins: [],
    });
  });

  test('can parse arithmetic expressions with negative numbers', () => {
    const tokens = ['SELECT', '*', 'FROM', 'table', 'WHERE', '-', '2', '+', 'value', '=', '5'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            {
              type: 'EXPRESSION',
              chain: [
                { type: 'LITERAL', value: -1 },
                NumericOperation.MULTIPLY,
                { type: 'LITERAL', value: 2 },
              ],
            },
            NumericOperation.ADD,
            { type: 'FIELD', fieldName: 'value' },
          ],
        },
        rhs: { type: 'LITERAL', value: 5 },
      },
      joins: [],
    });
  });

  test('can parse complex arithmetic expressions', () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'table',
      'WHERE',
      '3',
      '*',
      'field1',
      '/',
      '(',
      '1',
      '+',
      'FUNC',
      '(',
      'field2',
      ')',
      ')',
      '+',
      '3',
      '>',
      '5',
    ];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'table',
      },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GT,
        lhs: {
          type: 'EXPRESSION',
          chain: [
            {
              type: 'EXPRESSION',
              chain: [
                { type: 'LITERAL', value: 3 },
                NumericOperation.MULTIPLY,
                {
                  type: 'EXPRESSION',
                  chain: [
                    { type: 'FIELD', fieldName: 'field1' },
                    NumericOperation.DIVIDE,
                    {
                      type: 'EXPRESSION',
                      chain: [
                        { type: 'LITERAL', value: 1 },
                        NumericOperation.ADD,
                        {
                          type: 'FUNCTION_RESULT',
                          functionName: 'FUNC',
                          args: [
                            {
                              type: 'FIELD',
                              fieldName: 'field2',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            NumericOperation.ADD,
            { type: 'LITERAL', value: 3 },
          ],
        },
        rhs: { type: 'LITERAL', value: 5 },
      },
      joins: [],
    });
  });
});

describe('test parser handles order by', () => {
  test('ordering not specified', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'ORDER', 'BY', 'age'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      ordering: {
        field: 'age',
        order: Order.ASC,
      },
    });
  });

  test('ordering ascending specified', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'ORDER', 'BY', 'age', 'ASC'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      ordering: {
        field: 'age',
        order: Order.ASC,
      },
    });
  });

  test('ordering descending specified', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'ORDER', 'BY', 'age', 'DESC'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      ordering: {
        field: 'age',
        order: Order.DESC,
      },
    });
  });
});

describe('test parser handles limit and offset', () => {
  test('parser handles limit on its own with a simple numeric value', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'LIMIT', '10'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      limitAndOffset: {
        limit: {
          type: 'LITERAL',
          value: 10,
        },
      },
    });
  });

  test('parser handles offset on its own with a simple numeric value', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'OFFSET', '10'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      limitAndOffset: {
        offset: {
          type: 'LITERAL',
          value: 10,
        },
      },
    });
  });

  test('parser handles offset first and limit second with a simple numeric value', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'OFFSET', '10', 'LIMIT', '10'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      limitAndOffset: {
        limit: {
          type: 'LITERAL',
          value: 10,
        },
        offset: {
          type: 'LITERAL',
          value: 10,
        },
      },
    });
  });

  test('parser handles both limit first and offset second with a simple numeric value', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'LIMIT', '10', 'OFFSET', '10'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      limitAndOffset: {
        limit: {
          type: 'LITERAL',
          value: 10,
        },
        offset: {
          type: 'LITERAL',
          value: 10,
        },
      },
    });
  });

  test('parser handles both offset and limit with numeric expressions', () => {
    const tokens = ['SELECT', '*', 'FROM', 'cats', 'OFFSET', '5', '+', '5', 'LIMIT', '5', '+', '5'];

    const actual = parse(addSpanInfo(tokens));

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: {
        type: DataSetType.TABLE,
        value: 'cats',
      },
      joins: [],
      limitAndOffset: {
        limit: {
          type: 'EXPRESSION',
          chain: [
            {
              type: 'LITERAL',
              value: 5,
            },
            NumericOperation.ADD,
            {
              type: 'LITERAL',
              value: 5,
            },
          ],
        },
        offset: {
          type: 'EXPRESSION',
          chain: [
            {
              type: 'LITERAL',
              value: 5,
            },
            NumericOperation.ADD,
            {
              type: 'LITERAL',
              value: 5,
            },
          ],
        },
      },
    });
  });
});

describe('test parser error handling', () => {
  test('get sensible error when empty query parsed', () => {
    try {
      parse([]);
    } catch (err) {
      const extracted = extractParserError(err);
      // expect(extracted).toEqual({ message: 'Expected "SELECT"', pos: [0, 0] });
    }
  });

  test('"sum" with multiple fields throws an error', () => {
    const tokens = ['SELECT', 'SUM', '(', 'field1', ',', 'field2', ')', 'FROM', 'tableName'];

    expect(() => parse(addSpanInfo(tokens))).toThrowError(
      "Cannot use 'SUM' aggregation with multiple field names",
    );
  });

  test('"avg" with multiple fields throws an error', () => {
    const tokens = ['SELECT', 'AVG', '(', 'field1', ',', 'field2', ')', 'FROM', 'tableName'];

    expect(() => parse(addSpanInfo(tokens))).toThrowError(
      "Cannot use 'AVG' aggregation with multiple field names",
    );
  });

  test('"sum" with wildcard throws an error', () => {
    const tokens = ['SELECT', 'SUM', '(', '*', ')', 'FROM', 'tableName'];

    expect(() => parse(addSpanInfo(tokens))).toThrowError(
      "Cannot use 'SUM' aggregation with wildcard",
    );
  });

  test('"avg" with wildcard throws an error', () => {
    const tokens = ['SELECT', 'AVG', '(', '*', ')', 'FROM', 'tableName'];

    expect(() => parse(addSpanInfo(tokens))).toThrowError(
      "Cannot use 'AVG' aggregation with wildcard",
    );
  });
});
