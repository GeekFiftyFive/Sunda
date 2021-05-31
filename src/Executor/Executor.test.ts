import { execute } from '.';
import { ProjectionType, Query } from '../Parser';

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
});
