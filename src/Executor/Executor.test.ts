import { createObjectDataSource } from '../ObjectDataSource';
import { execute } from '.';
import {
  ProjectionType,
  Query,
  BooleanType,
  Comparison,
  SingularCondition,
  ConditionPair,
  AggregateType,
} from '../Parser';

const wrapAndExec = async <T>(query: Query, data: Record<string, unknown[]>) => {
  const datasource = createObjectDataSource(data);
  return execute<T>(query, datasource);
};

describe('test executeQuery', () => {
  test('exceute valid simple query', async () => {
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      table: 'test_data',
      joins: [],
    };

    const data = {
      test_data: [1, 2, 3, 4, 5],
    };

    const result = await wrapAndExec<number>(query, data);

    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('exceute valid simple query with count aggregate function', async () => {
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.COUNT,
      table: 'test_data',
      joins: [],
    };

    const data = {
      test_data: [1, 2, 3, 4, 5],
    };

    const result = await wrapAndExec<number>(query, data);

    expect(result).toEqual([{ count: 5 }]);
  });

  test('execute query with simple where clause on numeric values', async () => {
    // TODO: Add test coverage for other comparison types
    // TODO: Break this out into smaller tests
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      table: 'test_data',
      joins: [],
    };

    const data = {
      test_data: [
        {
          Oranges: 5,
          Grapes: 5,
          Apples: 10,
        },
        {
          Pairs: 5,
          Grapes: 10,
          Apples: 10,
        },
        {
          Grapes: 15,
          Apples: 5,
        },
      ],
    };

    let result = await wrapAndExec<Record<string, number>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.EQ,
          field: 'Apples',
          value: 10,
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);

    result = await wrapAndExec<Record<string, number>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.GTE,
          field: 'Grapes',
          value: 10,
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[1], data.test_data[2]]);

    result = await wrapAndExec<Record<string, number>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.AND,
          lhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.GTE,
            field: 'Grapes',
            value: 10,
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'Apples',
            value: 10,
          } as SingularCondition,
        } as ConditionPair,
      },
      data,
    );

    expect(result).toEqual([data.test_data[1]]);

    result = await wrapAndExec<Record<string, number>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.OR,
          lhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'Pairs',
            value: 5,
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'Oranges',
            value: 5,
          } as SingularCondition,
        } as ConditionPair,
      },
      data,
    );

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);

    result = await wrapAndExec<Record<string, number>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.OR,
          lhs: {
            boolean: BooleanType.NOT,
            comparison: Comparison.EQ,
            field: 'Pairs',
            value: 5,
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            field: 'Oranges',
            value: 5,
          } as SingularCondition,
        } as ConditionPair,
      },
      data,
    );

    expect(result).toEqual([data.test_data[0]]);
  });

  test('can dig into the structure of an object using json path', async () => {
    const data = {
      test_data: [
        {
          name: 'Brad',
          address: {
            line1: '53 Spruce Street',
            line2: 'Meadmead',
            city: 'Madeupton',
            county: 'Madeupshire',
          },
        },
        {
          name: 'Clara',
          address: {
            line1: '92 Maple Street',
            line2: null,
            city: 'Clowntown',
            county: 'Circushire',
          },
        },
      ],
    };

    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      aggregation: AggregateType.NONE,
      table: 'test_data',
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'address.city',
        value: 'Clowntown',
      } as SingularCondition,
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([data.test_data[1]]);
  });

  test('executor handles projections', async () => {
    const data = {
      test_data: [
        {
          firstName: 'Barry',
          surname: 'Smith',
          age: 20,
        },
        {
          firstName: 'Sarah',
          surname: 'Davis',
          age: 30,
        },
        {
          firstName: 'Moe',
          surname: 'Simon',
          age: 50,
        },
      ],
    };

    const query: Query = {
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['firstName', 'surname'],
      },
      aggregation: AggregateType.NONE,
      table: 'test_data',
      joins: [],
    };

    const result = await wrapAndExec<Record<string, string>>(query, data);
    expect(result).toEqual([
      {
        firstName: 'Barry',
        surname: 'Smith',
      },
      {
        firstName: 'Sarah',
        surname: 'Davis',
      },
      {
        firstName: 'Moe',
        surname: 'Simon',
      },
    ]);
  });
});

describe('test executor handles like operator', () => {
  const data = {
    test_data: [
      {
        name: 'ice-cream',
        flavour: 'sweet',
      },
      {
        name: 'steak',
        flavour: 'savoury',
      },
      {
        name: 'lime',
        flavour: 'sour',
      },
    ],
  };

  const query: Query = {
    projection: {
      type: ProjectionType.ALL,
    },
    aggregation: AggregateType.NONE,
    table: 'test_data',
    joins: [],
  };

  test('like operator properly handles % at beginning and end', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          field: 'name',
          value: '%ea%',
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);
  });

  test('like operator properly handles % at end', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          field: 'name',
          value: 's%',
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[1]]);
  });

  test('like operator properly handles % at the beginning', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          field: 'flavour',
          value: '%our',
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[2]]);
  });

  test('like operator properly handles _', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          field: 'flavour',
          value: 's____%',
        } as SingularCondition,
      },
      data,
    );

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);
  });

  test('like operator handles regex characters as literals', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          field: 'flavour',
          value: '.*',
        } as SingularCondition,
      },
      data,
    );

    expect(result).toHaveLength(0);
  });
});

describe('test executor handles distinct', () => {
  const data = {
    test_data: [
      {
        first_name: 'James',
        age: 24,
      },
      {
        first_name: 'Amy',
        age: 20,
      },
      {
        first_name: 'James',
        age: 50,
      },
      {
        first_name: 'Amy',
        age: 20,
      },
    ],
  };

  test('handles distinct keyword in basic case with one field', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.DISTINCT,
          fields: ['first_name'],
        },
        aggregation: AggregateType.NONE,
        table: 'test_data',
        joins: [],
      },
      data,
    );

    expect(result).toEqual([{ first_name: 'James' }, { first_name: 'Amy' }]);
  });

  test('handles distinct keyword in case with multiple fields', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.DISTINCT,
          fields: ['first_name', 'age'],
        },
        aggregation: AggregateType.NONE,
        table: 'test_data',
        joins: [],
      },
      data,
    );

    expect(result).toEqual([
      { first_name: 'James', age: 24 },
      { first_name: 'Amy', age: 20 },
      { first_name: 'James', age: 50 },
    ]);
  });

  test('handles count aggregation over distinct keyword in case with multiple fields', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.DISTINCT,
          fields: ['first_name', 'age'],
        },
        aggregation: AggregateType.COUNT,
        table: 'test_data',
        joins: [],
      },
      data,
    );

    expect(result).toEqual([{ count: 3 }]);
  });
});

describe('AVG and SUM aggregates', () => {
  const data = {
    treats: [
      {
        name: 'Chocolate',
        price: 1.5,
      },
      {
        name: 'Muffin',
        price: 3,
      },
      {
        name: 'Cake',
        price: 3.5,
      },
      {
        name: 'Scone',
        price: 2,
      },
    ],
  };

  test("handles valid 'AVG' query", async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.SELECTED,
          fields: ['price'],
        },
        aggregation: AggregateType.AVG,
        table: 'treats',
        joins: [],
      },
      data,
    );

    expect(result).toEqual([{ avg: 2.5 }]);
  });

  test("handles valid 'SUM' query", async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.SELECTED,
          fields: ['price'],
        },
        aggregation: AggregateType.SUM,
        table: 'treats',
        joins: [],
      },
      data,
    );

    expect(result).toEqual([{ sum: 10 }]);
  });

  test("executor throws an error when non numeric field passed to 'SUM' aggregation", async () => {
    await expect(
      wrapAndExec<Record<string, unknown>>(
        {
          projection: {
            type: ProjectionType.SELECTED,
            fields: ['name'],
          },
          aggregation: AggregateType.SUM,
          table: 'treats',
          joins: [],
        },
        data,
      ),
    ).rejects.toThrowError("Cannot use 'SUM' on non numeric field");
  });

  test("executor throws an error when non numeric field passed to 'AVG' aggregation", async () => {
    await expect(
      wrapAndExec<Record<string, unknown>>(
        {
          projection: {
            type: ProjectionType.SELECTED,
            fields: ['name'],
          },
          aggregation: AggregateType.AVG,
          table: 'treats',
          joins: [],
        },
        data,
      ),
    ).rejects.toThrowError("Cannot use 'AVG' on non numeric field");
  });
});

describe('executor can handle joins', () => {
  const data = {
    posts: [
      {
        ID: 1,
        PosterID: 1,
      },
      {
        ID: 2,
        PosterID: 1,
      },
      {
        ID: 3,
        PosterID: 2,
      },
      {
        ID: 4,
        PosterID: 2,
      },
    ],
    users: [
      {
        ID: 1,
        Name: 'George',
      },
      {
        ID: 2,
        Name: 'Fred',
      },
    ],
  };

  test('executor handles singular join with no alias', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        projection: {
          type: ProjectionType.ALL,
        },
        aggregation: AggregateType.NONE,
        table: 'posts',
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
        } as ConditionPair,
        joins: [{ table: 'users' }],
      },
      data,
    );

    expect(result).toEqual([
      {
        posts: {
          ID: 1,
          PosterID: 1,
        },
        users: {
          ID: 1,
          Name: 'George',
        },
      },
      {
        posts: {
          ID: 2,
          PosterID: 1,
        },
        users: {
          ID: 1,
          Name: 'George',
        },
      },
    ]);
  });
});
