import {
  BooleanType, Comparison, parse, ProjectionType,
} from './Parser';

describe('test parser', () => {
  test('parse simple valid query', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
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
      table: 'tableName',
      condition: {
        boolean: BooleanType.NONE,
        field: 'field',
        value: '"value"',
        comparison: Comparison.EQ,
      },
    });
  });
});
