import { functions } from './SQLFunctions';

describe("test 'ARRAY_POSITION' function", () => {
  const data = ['Charlie', 'Sam', 'Barry', 'Sam', 'Barbs'];

  test('test correct index is returned when no start index is specified', () => {
    const actual = functions.ARRAY_POSITION(data, 'Sam');
    expect(actual).toEqual(2);
  });

  test('test correct index is returned when input is not found', () => {
    const actual = functions.ARRAY_POSITION(data, 'Daniel');
    expect(actual).toEqual(null);
  });

  test('test correct index is returned when start index is specified', () => {
    const actual = functions.ARRAY_POSITION(data, 'Sam', 3);
    expect(actual).toEqual(4);
  });
});

describe("test 'REGEX_GROUP' function", () => {
  test('test correctly match a present match group in index 1', () => {
    const actual = functions.REGEX_GROUP('^Hello, (\\w*)(!)$', 'Hello, world!', 1);
    expect(actual).toEqual('world');
  });

  test('test fail to match a non-persent match group in index 1', () => {
    const actual = functions.REGEX_GROUP('^Hello, (\\w*)(!)$', 'Not present in regex', 1);
    expect(actual).toEqual(undefined);
  });

  test('test correctly match a present match group in index 2', () => {
    const actual = functions.REGEX_GROUP('^Hello, (\\w*)(!)$', 'Hello, world!', 2);
    expect(actual).toEqual('!');
  });

  test('test fail to match a non-persent match group in index 1', () => {
    const actual = functions.REGEX_GROUP('^Hello, (\\w*)(!)$', 'Not present in regex', 2);
    expect(actual).toEqual(undefined);
  });
});
