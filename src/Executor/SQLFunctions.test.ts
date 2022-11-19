import { functions } from './SQLFunctions';

// TODO: Test the errors states and argument validation of these functions
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

describe("test 'PARSE_NUMBER' function", () => {
  test('test can parse a valid integer', () => {
    const actual = functions.PARSE_NUMBER('42');
    expect(actual).toEqual(42);
  });

  test('test can parse a valid float', () => {
    const actual = functions.PARSE_NUMBER('3.1415');
    expect(actual).toEqual(3.1415);
  });
});

describe("test 'ARRAY_LENGTH' function", () => {
  test('test can get the length of a non empty array', () => {
    const actual = functions.ARRAY_LENGTH([1, 2, 3, 4]);
    expect(actual).toEqual(4);
  });

  test('test can get the length of an empty array', () => {
    const actual = functions.ARRAY_LENGTH([]);
    expect(actual).toEqual(0);
  });
});

describe("test 'COALESCE' function", () => {
  test('test get correct value when first value is non null/undefined', () => {
    const actual = functions.COALESCE([1, 2, 3, 4]);
    expect(actual).toEqual([1, 2, 3, 4]);
  });

  test('test get correct value when first value is non null/undefined', () => {
    const actual = functions.COALESCE(undefined, []);
    expect(actual).toEqual([]);
  });

  test('test get undefined when all values are null/undefined', () => {
    const actual = functions.COALESCE(undefined, undefined);
    expect(actual).toEqual(undefined);
  });
});
