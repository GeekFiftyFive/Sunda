import {
  AggregateType,
  BooleanType,
  Comparison,
  DataSetType,
  parse,
  ProjectionType,
} from './Parser';

describe('test parser', () => {
  test('parse simple valid query', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test('parse simple valid query in lowercase', () => {
    const tokens = ['select', '*', 'from', 'tableName'];
    const query = parse(tokens);

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
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 'value',
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parse valid query with single quotes', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'field', '=', "'value'", ';'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 'value',
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test('parser should parse numeric values', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'field', '=', '10', ';'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 10,
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test("parser should handle 'and' in the where clause", () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'and',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(tokens);

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
          field: 'field1',
          value: 10,
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          field: 'field2',
          value: 'value',
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test("parser should handle 'or' in the where clause", () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'or',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(tokens);

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
          field: 'field1',
          value: 10,
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          field: 'field2',
          value: 'value',
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test("parser should handle 'and' and 'or' in the where clause", () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'field1',
      '=',
      '10',
      'or',
      'field2',
      'LIKE',
      '"value"',
      'and',
      'field3',
      '>=',
      '8',
      ';',
    ];
    const query = parse(tokens);

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
          field: 'field1',
          value: 10,
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.AND,
          lhs: {
            boolean: BooleanType.NONE,
            field: 'field2',
            value: 'value',
            comparison: Comparison.LIKE,
          },
          rhs: {
            boolean: BooleanType.NONE,
            field: 'field3',
            value: 8,
            comparison: Comparison.GTE,
          },
        },
      },
      joins: [],
    });
  });

  test("parser should handle 'not' in the where clause", () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName', 'WHERE', 'NOT', 'field1', '=', '10'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      condition: {
        boolean: BooleanType.NOT,
        field: 'field1',
        value: 10,
        comparison: Comparison.EQ,
      },
      joins: [],
    });
  });

  test("parser should handle 'not' and 'and' in the where clause", () => {
    const tokens = [
      'SELECT',
      '*',
      'FROM',
      'tableName',
      'WHERE',
      'not',
      'field1',
      '=',
      '10',
      'and',
      'field2',
      'LIKE',
      '"value"',
      ';',
    ];
    const query = parse(tokens);

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
          field: 'field1',
          value: 10,
          comparison: Comparison.EQ,
        },
        rhs: {
          boolean: BooleanType.NONE,
          field: 'field2',
          value: 'value',
          comparison: Comparison.LIKE,
        },
      },
      joins: [],
    });
  });

  test('parser should handle projections', () => {
    const tokens = ['SELECT', 'name', ',', 'age', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.SELECTED,
          fields: ['name', 'age'],
        },
        joins: [],
      }),
    );
  });

  test("parser should handle 'distinct' keyword", () => {
    const tokens = ['SELECT', 'DISTINCT', 'name', ',', 'age', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.DISTINCT,
          fields: ['name', 'age'],
        },
        joins: [],
      }),
    );
  });

  test("parse simple 'count' aggregation", () => {
    const tokens = ['SELECT', 'COUNT', '(', '*', ')', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.COUNT,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test("parser should handle distinct 'count' aggregate function", () => {
    const tokens = ['SELECT', 'COUNT', '(', 'DISTINCT', 'colour', ')', 'FROM', 'furniture'];
    const query = parse(tokens);

    expect(query).toEqual(
      expect.objectContaining({
        projection: {
          type: ProjectionType.DISTINCT,
          fields: ['colour'],
        },
        aggregation: AggregateType.COUNT,
        joins: [],
      }),
    );
  });

  test("parse simple 'sum' aggregation", () => {
    const tokens = ['SELECT', 'SUM', '(', 'fieldName', ')', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['fieldName'],
      },
      aggregation: AggregateType.SUM,
      dataset: { type: DataSetType.TABLE, value: 'tableName' },
      joins: [],
    });
  });

  test("parse simple 'avg' aggregation", () => {
    const tokens = ['SELECT', 'AVG', '(', 'fieldName', ')', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['fieldName'],
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
      'and',
      'users.Name',
      '=',
      '"George"',
    ];
    const query = parse(tokens);

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
          field: 'posts.PosterID',
          value: {
            field: 'users.ID',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          field: 'users.Name',
          value: 'George',
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
      'posts.PosterId',
      '=',
      'users.ID',
      'AND',
      'posts.Views',
      '>=',
      '10',
    ];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.DISTINCT,
        fields: ['users.Name'],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.AND,
        lhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          field: 'posts.PosterId',
          value: {
            field: 'users.ID',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.GTE,
          field: 'posts.Views',
          value: 10,
        },
      },
      joins: [{ table: 'users' }],
    });
  });

  test("parse simple join using 'on'", () => {
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
    const query = parse(tokens);

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
          field: 'posts.PosterID',
          value: {
            field: 'users.ID',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          field: 'users.Name',
          value: 'George',
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
      "'123 Street Lane'",
    ];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['address.line1'],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'address.line1',
        value: '123 Street Lane',
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
      "'123 Street Lane'",
    ];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.DISTINCT,
        fields: ['address.line1'],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'address.line1',
        value: '123 Street Lane',
      },
      joins: [],
    });
  });
});

describe("test parsing 'IN' operator", () => {
  test('parse in operator with numeric values', () => {
    const tokens = ['SELECT', '*', 'FROM', 'posts', 'WHERE', 'ID', 'IN', '(', '1', ',', '3', ')'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.IN,
        field: 'ID',
        value: [1, 3],
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
      "'Hello, world'",
      ',',
      "'Goodbye all!'",
      ')',
    ];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.IN,
        field: 'Title',
        value: ['Hello, world', 'Goodbye all!'],
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
      "'Goodbye all!'",
      'or',
      'Title',
      '=',
      "'Hello, world'",
      ')',
      'and',
      'Views',
      '>',
      '10',
    ];
    const query = parse(tokens);

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
            field: 'Title',
            value: 'Goodbye all!',
          },
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'Title',
            value: 'Hello, world',
          },
        },
        rhs: {
          boolean: BooleanType.NONE,
          comparison: Comparison.GT,
          field: 'Views',
          value: 10,
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
      "'Goodbye all!'",
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

    const actual = parse(tokens);

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
          field: 'Title',
          value: 'Goodbye all!',
        },
        rhs: {
          boolean: BooleanType.OR,
          lhs: {
            boolean: BooleanType.AND,
            lhs: {
              boolean: BooleanType.NONE,
              comparison: Comparison.IN,
              field: 'Value',
              value: [1, 2],
            },
            rhs: {
              boolean: BooleanType.NONE,
              comparison: Comparison.GT,
              field: 'Views',
              value: 10,
            },
          },
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'ID',
            value: 10,
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
      'as',
      'u',
      'WHERE',
      'u.age',
      '>',
      '21',
    ];

    const actual = parse(tokens);

    expect(actual).toEqual({
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['u.age'],
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
        field: 'u.age',
        value: 21,
      },
      joins: [],
    });
  });
});

describe('test parser error handling', () => {
  test('get sensible error when empty query parsed', () => {
    expect(() => parse([])).toThrow(new Error("Expected 'SELECT'"));
  });

  test("'sum' with multiple fields throws an error", () => {
    const tokens = ['SELECT', 'SUM', '(', 'field1', ',', 'field2', ')', 'FROM', 'tableName'];

    expect(() => parse(tokens)).toThrowError(
      "Cannot use 'SUM' aggregation with multiple field names",
    );
  });

  test("'avg' with multiple fields throws an error", () => {
    const tokens = ['SELECT', 'AVG', '(', 'field1', ',', 'field2', ')', 'FROM', 'tableName'];

    expect(() => parse(tokens)).toThrowError(
      "Cannot use 'AVG' aggregation with multiple field names",
    );
  });

  test("'sum' with wildcard throws an error", () => {
    const tokens = ['SELECT', 'SUM', '(', '*', ')', 'FROM', 'tableName'];

    expect(() => parse(tokens)).toThrowError("Cannot use 'SUM' aggregation with wildcard");
  });

  test("'avg' with wildcard throws an error", () => {
    const tokens = ['SELECT', 'AVG', '(', '*', ')', 'FROM', 'tableName'];

    expect(() => parse(tokens)).toThrowError("Cannot use 'AVG' aggregation with wildcard");
  });
});
