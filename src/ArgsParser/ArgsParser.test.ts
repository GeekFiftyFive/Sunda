import { createArgsParser } from '.';

describe('ArgsParser', () => {
  test('Value is used as default when not proceeded by a flag', () => {
    const parser = createArgsParser([
      {
        key: 'default',
        default: true,
      },
    ]);

    expect(parser(['default value'])).toEqual({
      default: 'default value',
    });
  });

  test('Longhand flags are properly parsed', () => {
    const parser = createArgsParser([
      {
        key: 'flag1',
        longhand: '--flag_one',
      },
      {
        key: 'flag2',
        longhand: '--flag_two',
      },
    ]);

    expect(parser(['--flag_one', 'flag 1 value', '--flag_two', 'flag 2 value'])).toEqual({
      flag1: 'flag 1 value',
      flag2: 'flag 2 value',
    });
  });

  test('Shorthand flags are properly parsed', () => {
    const parser = createArgsParser([
      {
        key: 'flag1',
        shorthand: '--f1',
      },
      {
        key: 'flag2',
        shorthand: '--f2',
      },
    ]);

    expect(parser(['--f1', 'flag 1 value', '--f2', 'flag 2 value'])).toEqual({
      flag1: 'flag 1 value',
      flag2: 'flag 2 value',
    });
  });

  test('A mixture of flags parses', () => {
    const parser = createArgsParser([
      {
        key: 'flag1',
        shorthand: '--f1',
        longhand: '--flag_one',
      },
      {
        key: 'flag2',
        shorthand: '--f2',
        longhand: '--flag_two',
      },
      {
        key: 'default',
        default: true,
      },
    ]);

    expect(parser(['default value', '--f1', 'flag 1 value', '--flag_two', 'flag 2 value'])).toEqual(
      {
        flag1: 'flag 1 value',
        flag2: 'flag 2 value',
        default: 'default value',
      },
    );
  });

  test('an exception is thrown when an invalid flag is passed in', () => {
    const parser = createArgsParser([
      {
        key: 'flag1',
        shorthand: '--f1',
        longhand: '--flag_one',
      },
      {
        key: 'flag2',
        shorthand: '--f2',
        longhand: '--flag_two',
      },
      {
        key: 'default',
        default: true,
      },
    ]);

    expect(() => parser(['default', '--f1', 'flag 1 value', '--g1', 'invalid value'])).toThrowError(
      new Error("Invalid flag '--g1'"),
    );
  });
});
