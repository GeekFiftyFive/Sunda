import { execute } from '.';
import {
  ProjectionType, Query, BooleanType, Comparison,
} from '../Parser';

describe('test executeQuery', () => {
  test('exceute valid simple query', () => {
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      table: 'test_data',
    };

    const data = {
      test_data: [1, 2, 3, 4, 5],
    };

    const result = execute<number>(query, data);

    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('execute query with simple where clause', () => {
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      table: 'test_data',
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'Apples',
        value: 10,
      },
    };

    const data = {
      test_data: [
        {
          Oranges: 5,
          Apples: 10,
        },
        {
          Pairs: 5,
          Apples: 10,
        },
        {
          Grapes: 15,
          Apples: 5,
        },
      ],
    };

    const result = execute<number>(query, data);
    expect(result).toEqual([
      {
        Oranges: 5,
        Apples: 10,
      },
      {
        Pairs: 5,
        Apples: 10,
      },
    ]);
  });
});
