import { execute } from '.';
import {
  ProjectionType, Query, BooleanType, Comparison, SingularCondition, ConditionPair,
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

  test('execute query with simple where clause on numeric values', () => {
    // TODO: Add test coverage for other comparison types
    // TODO: Break this out into smaller tests
    const query: Query = {
      projection: {
        type: ProjectionType.ALL,
      },
      table: 'test_data',
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

    let result = execute<Record<string, number>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'Apples',
        value: 10,
      } as SingularCondition,
    }, data);

    expect(result).toEqual([
      data.test_data[0], data.test_data[1],
    ]);

    result = execute<Record<string, number>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.GTE,
        field: 'Grapes',
        value: 10,
      } as SingularCondition,
    }, data);

    expect(result).toEqual([
      data.test_data[1], data.test_data[2],
    ]);

    result = execute<Record<string, number>>({
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
    }, data);

    expect(result).toEqual([data.test_data[1]]);

    result = execute<Record<string, number>>({
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
    }, data);

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);

    result = execute<Record<string, number>>({
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
    }, data);

    expect(result).toEqual([data.test_data[0]]);
  });

  test('can dig into the structure of an object using json path', () => {
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
      table: 'test_data',
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.EQ,
        field: 'address.city',
        value: 'Clowntown',
      } as SingularCondition,
    };

    const result = execute<Record<string, unknown>>(query, data);

    expect(result).toEqual([data.test_data[1]]);
  });

  test('executor handles projections', () => {
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
      table: 'test_data',
    };

    const result = execute<Record<string, string>>(query, data);
    expect(result).toEqual([{
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
    }]);
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
    table: 'test_data',
  };

  test('like operator properly handles % at beginning and end', () => {
    const result = execute<Record<string, unknown>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.LIKE,
        field: 'name',
        value: '%ea%',
      } as SingularCondition,
    }, data);

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);
  });

  test('like operator properly handles % at end', () => {
    const result = execute<Record<string, unknown>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.LIKE,
        field: 'name',
        value: 's%',
      } as SingularCondition,
    }, data);

    expect(result).toEqual([data.test_data[1]]);
  });

  test('like operator properly handles % at the beginning', () => {
    const result = execute<Record<string, unknown>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.LIKE,
        field: 'flavour',
        value: '%our',
      } as SingularCondition,
    }, data);

    expect(result).toEqual([data.test_data[2]]);
  });

  test('like operator properly handles _', () => {
    const result = execute<Record<string, unknown>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.LIKE,
        field: 'flavour',
        value: 's____%',
      } as SingularCondition,
    }, data);

    expect(result).toEqual([data.test_data[0], data.test_data[1]]);
  });

  test('like operator handles regex characters as literals', () => {
    const result = execute<Record<string, unknown>>({
      ...query,
      condition: {
        boolean: BooleanType.NONE,
        comparison: Comparison.LIKE,
        field: 'flavour',
        value: '.*',
      } as SingularCondition,
    }, data);

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

  test('handles distinct keyword in basic case with one field', () => {
    const result = execute<Record<string, unknown>>({
      projection: {
        type: ProjectionType.DISTINCT,
        fields: ['first_name'],
      },
      table: 'test_data',
    }, data);

    expect(result).toEqual([{ first_name: 'James' }, { first_name: 'Amy' }]);
  });

  /* test('handles distinct keyword in case with multiple fields', () => {
    const result = execute<Record<string, unknown>>({
      projection: {
        type: ProjectionType.DISTINCT,
        fields: ['first_name'],
      },
      table: 'test_data',
    }, data);

    expect(result).toEqual(['James', 'Amy']);
  }); */
});
