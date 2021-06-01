import { executeQuery } from '.';

describe('End to end tests', () => {
  test('simple query with conditional', () => {
    const query = 'SELECT * FROM tableName WHERE value>10';
    const data = {
      tableName: [
        {
          name: 'Test 1',
          value: 20,
        },
        {
          name: 'Test 2',
          value: 9,
        },
        {
          name: 'Test 3',
          value: 11,
        },
        {
          name: 'Test 4',
          value: 10,
        },
      ],
    };

    const actual = executeQuery<{ tableName: string, value: number }>(query, data);
    expect(actual).toEqual([{
      name: 'Test 1',
      value: 20,
    }, {
      name: 'Test 3',
      value: 11,
    }]);
  });
});
