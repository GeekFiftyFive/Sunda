import { Maybe } from './Maybe';

describe('Maybe', () => {
  test('isEmpty returns true for empty Maybe', () => {
    expect(Maybe.fromEmpty().isEmpty()).toBeTruthy();
  });

  test('isEmpty returns false for non empty Maybe', () => {
    expect(Maybe.fromValue<number>(2).isEmpty()).toBeFalsy();
  });

  test('getValue should return value for non empty Maybe', () => {
    expect(Maybe.fromValue<number>(2).getValue()).toEqual(2);
  });

  test('getValue should throw an Error for empty Maybe', () => {
    const maybe = Maybe.fromEmpty();
    expect(maybe.getValue.bind(maybe)).toThrowError('Attempted to read value of empty Maybe');
  });
});
