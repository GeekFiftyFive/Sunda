import { executeQueryFromObject } from '.';

describe('End to end tests of simple queries', () => {
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

  test('simple query with conditional', async () => {
    const query = 'SELECT * FROM tableName WHERE value>10';

    const actual = await executeQueryFromObject<{ tableName: string; value: number }>(query, data);
    expect(actual).toEqual([
      {
        name: 'Test 1',
        value: 20,
        id: 1,
      },
      {
        name: 'Test 3',
        value: 11,
        id: 6,
      },
    ]);
  });

  test("simple query with 'AND' conditional", async () => {
    const query = 'SELECT * FROM tableName WHERE value >= 10 AND id > 5';

    const actual = await executeQueryFromObject<{ tableName: string; value: number }>(query, data);
    expect(actual).toEqual([
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
    ]);
  });
});

describe('End to end tests of aggregate queries', () => {
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

  test("simple query with 'sum' aggregate", async () => {
    const query = 'SELECT SUM(value) FROM tableName';

    const actual = await executeQueryFromObject<{ sum: number }>(query, data);
    expect(actual).toEqual([{ sum: 50 }]);
  });

  test("simple query with 'avg' aggregate", async () => {
    const query = 'SELECT AVG(value) FROM tableName';

    const actual = await executeQueryFromObject<{ avg: number }>(query, data);
    expect(actual).toEqual([{ avg: 12.5 }]);
  });

  test("simple query with 'count' aggregate", async () => {
    const query = 'SELECT COUNT(*) FROM tableName';

    const actual = await executeQueryFromObject<{ count: number }>(query, data);
    expect(actual).toEqual([{ count: 4 }]);
  });
});
