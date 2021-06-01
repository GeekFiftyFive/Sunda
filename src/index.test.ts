import { executeQuery } from '.';

describe('End to end tests', () => {
  const data = {
    tableName: [
      {
        name: 'Test 1',
        value: 20,
        id: 1,
      },
      {
        name: 'Test 2',
        value: 9,
        id: 5,
      },
      {
        name: 'Test 3',
        value: 11,
        id: 6,
      },
      {
        name: 'Test 4',
        value: 10,
        id: 11,
      },
    ],
  };

  test('simple query with conditional', () => {
    const query = 'SELECT * FROM tableName WHERE value>10';

    const actual = executeQuery<{ tableName: string, value: number }>(query, data);
    expect(actual).toEqual([{
      name: 'Test 1',
      value: 20,
      id: 1,
    }, {
      name: 'Test 3',
      value: 11,
      id: 6,
    }]);
  });

  test('simple query with \'AND\' conditional', () => {
    const query = 'SELECT * FROM tableName WHERE value >= 10 AND id > 5';

    const actual = executeQuery<{ tableName: string, value: number }>(query, data);
    expect(actual).toEqual([{
      name: 'Test 3',
      value: 11,
      id: 6,
    },
    {
      name: 'Test 4',
      value: 10,
      id: 11,
    }]);
  });
});
