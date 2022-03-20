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
