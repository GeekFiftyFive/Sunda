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
  DataSetType,
  FunctionName,
  LiteralValue,
  FieldValue,
  NumericOperation,
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
      dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
      dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
      dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
          lhs: { type: 'FIELD', fieldName: 'Apples' },
          rhs: { type: 'LITERAL', value: 10 },
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
          lhs: { type: 'FIELD', fieldName: 'Grapes' },
          rhs: { type: 'LITERAL', value: 10 },
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
            lhs: { type: 'FIELD', fieldName: 'Grapes' },
            rhs: { type: 'LITERAL', value: 10 },
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'Apples' },
            rhs: { type: 'LITERAL', value: 10 },
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
            lhs: { type: 'FIELD', fieldName: 'Pairs' },
            rhs: { type: 'LITERAL', value: 5 },
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'Oranges' },
            rhs: { type: 'LITERAL', value: 5 },
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
            lhs: { type: 'FIELD', fieldName: 'Pairs' },
            rhs: { type: 'LITERAL', value: 5 },
          } as SingularCondition,
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.EQ,
            lhs: { type: 'FIELD', fieldName: 'Oranges' },
            rhs: { type: 'LITERAL', value: 5 },
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
      dataset: { type: DataSetType.TABLE, value: 'test_data' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'address.city' },
        rhs: { type: 'LITERAL', value: 'Clowntown' },
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
      dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
    dataset: { type: DataSetType.TABLE, value: 'test_data' },
    joins: [],
  };

  test('like operator properly handles % at beginning and end', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
        ...query,
        condition: {
          boolean: BooleanType.NONE,
          comparison: Comparison.LIKE,
          lhs: { type: 'FIELD', fieldName: 'name' },
          rhs: { type: 'LITERAL', value: '%ea%' },
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
          lhs: { type: 'FIELD', fieldName: 'name' },
          rhs: { type: 'LITERAL', value: 's%' },
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
          lhs: { type: 'FIELD', fieldName: 'flavour' },
          rhs: { type: 'LITERAL', value: '%our' },
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
          lhs: { type: 'FIELD', fieldName: 'flavour' },
          rhs: { type: 'LITERAL', value: 's____%' },
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
          lhs: { type: 'FIELD', fieldName: 'flavour' },
          rhs: { type: 'LITERAL', value: '.*' },
        } as SingularCondition,
      },
      data,
    );

    expect(result).toHaveLength(0);
  });
});

describe('test executor handles subfields in select', () => {
  const data = {
    users: [
      {
        name: 'Eda',
        address: {
          line1: '123 Street Lane',
          line2: 'Fake Town',
        },
      },
      {
        name: 'Lillith',
        address: {
          line1: '123 Street Lane',
          line2: 'Fake Town',
        },
      },
      {
        name: 'Anne',
        address: {
          line1: '456 Road Street',
          line2: 'Fake City',
        },
      },
      {
        name: 'Marcy',
        address: {
          line1: '456 Road Street',
          line2: 'Fake City',
        },
      },
    ],
  };

  test('can execute selection of subfield', async () => {
    const query: Query = {
      projection: {
        type: ProjectionType.SELECTED,
        fields: ['address.line1'],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        lhs: { type: 'FIELD', fieldName: 'address.line1' },
        rhs: { type: 'LITERAL', value: '123 Street Lane' },
      } as SingularCondition,
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([
      { address: { line1: '123 Street Lane' } },
      { address: { line1: '123 Street Lane' } },
    ]);
  });

  test('can execute selection of subfield with distinct', async () => {
    const query: Query = {
      projection: {
        type: ProjectionType.DISTINCT,
        fields: ['address.line1'],
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'users' },
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([
      { address: { line1: '123 Street Lane' } },
      { address: { line1: '456 Road Street' } },
    ]);
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
        dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
        dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
        dataset: { type: DataSetType.TABLE, value: 'test_data' },
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
        dataset: { type: DataSetType.TABLE, value: 'treats' },
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
        dataset: { type: DataSetType.TABLE, value: 'treats' },
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
          dataset: { type: DataSetType.TABLE, value: 'treats' },
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
          dataset: { type: DataSetType.TABLE, value: 'treats' },
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
        Views: 10,
      },
      {
        ID: 2,
        PosterID: 1,
        Views: 11,
      },
      {
        ID: 3,
        PosterID: 2,
        Views: 12,
      },
      {
        ID: 4,
        PosterID: 2,
        Views: 8,
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
          Views: 10,
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
          Views: 11,
        },
        users: {
          ID: 1,
          Name: 'George',
        },
      },
    ]);
  });

  test('executor handles join with no constraint on joined table', async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
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
            lhs: { type: 'FIELD', fieldName: 'posts.PosterID' },
            rhs: { type: 'FIELD', fieldName: 'users.ID' },
          },
          rhs: {
            boolean: BooleanType.NONE,
            comparison: Comparison.GTE,
            lhs: { type: 'FIELD', fieldName: 'posts.Views' },
            rhs: { type: 'LITERAL', value: 10 },
          },
        } as ConditionPair,
        joins: [{ table: 'users' }],
      },
      data,
    );

    expect(result).toEqual([
      {
        users: {
          Name: 'George',
        },
      },
      {
        users: {
          Name: 'Fred',
        },
      },
    ]);
  });
});

describe("executor can handle 'IN' operator", () => {
  const data = {
    posts: [
      {
        ID: 1,
        PosterID: 1,
        Views: 10,
        Title: 'Hello, world',
      },
      {
        ID: 2,
        PosterID: 1,
        Views: 11,
        Title: 'Hello, all',
      },
      {
        ID: 3,
        PosterID: 2,
        Views: 12,
        Title: 'Goodbye, folks!',
      },
      {
        ID: 4,
        PosterID: 2,
        Views: 8,
        Title: 'Goodbye all!',
      },
    ],
  };

  test("executor can handle 'IN' operator with numeric values", async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
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
        } as SingularCondition,
        joins: [],
      },
      data,
    );

    expect(result).toEqual([
      {
        ID: 1,
        PosterID: 1,
        Views: 10,
        Title: 'Hello, world',
      },
      {
        ID: 3,
        PosterID: 2,
        Views: 12,
        Title: 'Goodbye, folks!',
      },
    ]);
  });

  test("executor can handle 'IN' operator with string values", async () => {
    const result = await wrapAndExec<Record<string, unknown>>(
      {
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
        } as SingularCondition,
        joins: [],
      },
      data,
    );

    expect(result).toEqual([
      {
        ID: 1,
        PosterID: 1,
        Views: 10,
        Title: 'Hello, world',
      },
      {
        ID: 4,
        PosterID: 2,
        Views: 8,
        Title: 'Goodbye all!',
      },
    ]);
  });
});

describe('Executor can handle sub-queries', () => {
  const data = {
    users: [
      {
        name: 'Glendale',
        age: 36,
      },
      {
        name: 'Zulius',
        age: 42,
      },
      {
        name: 'Horse',
        age: 20,
      },
      {
        name: 'Rider',
        age: 21,
      },
    ],
  };

  test('execute basic sub-query', async () => {
    const query: Query = {
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
        lhs: { type: 'FIELD', fieldName: 'u.age' },
        rhs: { type: 'LITERAL', value: 21 },
      } as SingularCondition,
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([
      {
        u: {
          age: 36,
        },
      },
      {
        u: {
          age: 42,
        },
      },
    ]);
  });
});

describe('executor can handle function calls', () => {
  const data = {
    posts: [
      {
        entry: 1,
        names: ['Fred', 'James'],
      },
      {
        entry: 2,
        names: ['Amy', 'Abby'],
      },
      {
        entry: 3,
        names: ['James', 'Fred'],
      },
      {
        entry: 4,
        names: ['Fred', 'Abby', 'Julia'],
      },
    ],
  };
  test("can execute 'ARRAY_POSITION'", async () => {
    const query: Query = {
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
      } as SingularCondition,
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([
      {
        entry: 1,
        names: ['Fred', 'James'],
      },
      {
        entry: 3,
        names: ['James', 'Fred'],
      },
      {
        entry: 4,
        names: ['Fred', 'Abby', 'Julia'],
      },
    ]);
  });

  test('can execute functions that appear on the right hand side of condition', async () => {
    const query: Query = {
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
              value: 'James',
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
              value: 'Fred',
            },
          ],
        },
      } as SingularCondition,
      joins: [],
    };

    const result = await wrapAndExec<Record<string, unknown>>(query, data);

    expect(result).toEqual([
      {
        entry: 1,
        names: ['Fred', 'James'],
      },
    ]);
  });

  test("can execute function calls that occur in the 'SELECT' statement", async () => {
    const aliasesData = {
      posts: [
        {
          aliases: ['Fred', 'Joe', 'Sam'],
        },
        {
          aliases: ['Jimmy', 'Fred', 'Liz'],
        },
        {
          aliases: ['Raiden', 'Armstrong', 'Sundowner'],
        },
      ],
    };

    const query: Query = {
      projection: {
        type: ProjectionType.FUNCTION,
        function: {
          type: 'FUNCTION_RESULT',
          functionName: FunctionName.ARRAY_POSITION,
          args: [
            {
              type: 'FIELD',
              fieldName: 'aliases',
            } as FieldValue,
            {
              type: 'LITERAL',
              value: 'Fred',
            } as LiteralValue,
          ],
        },
      },
      aggregation: AggregateType.NONE,
      dataset: { type: DataSetType.TABLE, value: 'posts' },
      joins: [],
    };

    const actual = await wrapAndExec<Record<string, unknown>>(query, aliasesData);

    expect(actual).toEqual([{ 0: 1 }, { 0: 2 }, { 0: null }]);
  });
});

describe('Executor can handle arithmetic', () => {
  test('can execute queries with basic arithmetic expressions', async () => {
    const data = {
      table: [
        {
          value: 2,
        },
        {
          value: 2.5,
        },
        {
          value: 3,
        },
        {
          value: 4,
        },
      ],
    };

    const query: Query = {
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
          lhs: { type: 'FIELD', fieldName: 'value' },
          rhs: { type: 'LITERAL', value: 2 },
          operation: NumericOperation.MULTIPLY,
        },
        rhs: { type: 'LITERAL', value: 5 },
      } as SingularCondition,
      joins: [],
    };

    const actual = await wrapAndExec<{ value: number }>(query, data);

    expect(actual).toEqual([
      {
        value: 3,
      },
      {
        value: 4,
      },
    ]);
  });

  test('can execute queries with complex arithmetic expressions', async () => {
    const data = {
      table: [
        {
          field1: 2,
          field2: ['SPORTS', 'FOOD'],
        },
        {
          field1: 2.5,
          field2: ['TV', 'SPORTS'],
        },
        {
          field1: 3,
          field2: ['FOOD', 'GAMES'],
        },
        {
          field1: 4,
          field2: ['READING', 'KNITTING'],
        },
      ],
    };

    const query: Query = {
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
          lhs: {
            type: 'EXPRESSION',
            lhs: { type: 'LITERAL', value: 3 },
            rhs: {
              type: 'EXPRESSION',
              lhs: { type: 'FIELD', fieldName: 'field1' },
              rhs: {
                type: 'EXPRESSION',
                lhs: { type: 'LITERAL', value: 1 },
                rhs: {
                  type: 'FUNCTION_RESULT',
                  functionName: 'ARRAY_POSITION',
                  args: [
                    {
                      type: 'FIELD',
                      fieldName: 'field2',
                    },
                    {
                      type: 'LITERAL',
                      value: 'FOOD',
                    },
                  ],
                },
                operation: NumericOperation.ADD,
              },
              operation: NumericOperation.DIVIDE,
            },
            operation: NumericOperation.MULTIPLY,
          },
          rhs: { type: 'LITERAL', value: 3 },
          operation: NumericOperation.ADD,
        },
        rhs: { type: 'LITERAL', value: 7.5 },
      } as SingularCondition,
      joins: [],
    };

    const actual = await wrapAndExec<{ field1: number; field2: string[] }>(query, data);

    expect(actual).toEqual([
      {
        field1: 3,
        field2: ['FOOD', 'GAMES'],
      },
    ]);
  });
});
