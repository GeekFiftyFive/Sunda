import { AggregateType, BooleanType, Comparison, parse, ProjectionType } from './Parser';

describe('test parser', () => {
  test('parse simple valid query', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      table: 'tableName',
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
      table: 'tableName',
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
      table: 'tableName',
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 'value',
        comparison: Comparison.EQ,
      },
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
      table: 'tableName',
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 'value',
        comparison: Comparison.EQ,
      },
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
      table: 'tableName',
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: 10,
        comparison: Comparison.EQ,
      },
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
      table: 'tableName',
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
      table: 'tableName',
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
      table: 'tableName',
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
      table: 'tableName',
      condition: {
        boolean: BooleanType.NOT,
        field: 'field1',
        value: 10,
        comparison: Comparison.EQ,
      },
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
      table: 'tableName',
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
      table: 'tableName',
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
      }),
    );
  });

  test("parse simple 'sum' aggregation", () => {
    const tokens = ['SELECT', 'SUM', '(', '*', ')', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.SUM,
      table: 'tableName',
    });
  });

  test("parse simple 'avg' aggregation", () => {
    const tokens = ['SELECT', 'AVG', '(', '*', ')', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.AVG,
      table: 'tableName',
    });
  });
});

describe('test parser error handling', () => {
  test('get sensible error when empty query parsed', () => {
    expect(() => parse([])).toThrow(new Error("Expected 'SELECT'"));
  });
});
