import { createArgsParser } from '.';

describe('ArgsParser', () => {
  test('Value is used as default when not proceeded by a flag', () => {
    const { parser } = createArgsParser([
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
    const { parser } = createArgsParser([
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
    const { parser } = createArgsParser([
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
    const { parser } = createArgsParser([
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

  test("specifying 'noInput' prevents a flag from consuming next token", () => {
    const { parser } = createArgsParser([
      {
        key: 'flag1',
        shorthand: '--f1',
        longhand: '--flag_one',
      },
      {
        key: 'flag2',
        shorthand: '--f2',
        longhand: '--flag_two',
        noInput: true,
      },
      {
        key: 'flag3',
        shorthand: '--f3',
        longhand: '--flag_three',
        noInput: true,
      },
      {
        key: 'default',
        default: true,
      },
    ]);

    expect(parser(['default value', '--flag_two', '--f1', 'flag 1 value', '--f3'])).toEqual({
      flag1: 'flag 1 value',
      flag2: true,
      flag3: true,
      default: 'default value',
    });
  });

  test('dumpUsage outputs expected help document', () => {
    const logger = jest.fn();
    const { dumpUsage } = createArgsParser([
      {
        key: 'flag1',
        shorthand: '--f1',
        longhand: '--flag_one',
        description: 'The first flag',
      },
      {
        key: 'flag2',
        shorthand: '--f2',
        longhand: '--flag_two',
        description: 'The second flag',
      },
      {
        key: 'longFlag',
        shorthand: '--lf',
        longhand: '--this_is_a_long_flag',
        description: 'The longest flag',
      },
      {
        key: 'default',
        default: true,
        description: 'default value',
      },
    ]);

    dumpUsage('program', logger);

    expect(logger).toBeCalledTimes(5);
    expect(logger.mock.calls[0][0]).toEqual(
      'Usage: program <default value> [--flag_one | --f1] [--flag_two | --f2] [--this_is_a_long_flag | --lf]',
    );
    expect(logger.mock.calls[1][0]).toEqual('');
    expect(logger.mock.calls[2][0]).toEqual('--flag_one, --f1               The first flag');
    expect(logger.mock.calls[3][0]).toEqual('--flag_two, --f2               The second flag');
    expect(logger.mock.calls[4][0]).toEqual('--this_is_a_long_flag, --lf    The longest flag');
  });

  test('an exception is thrown when an invalid flag is passed in', () => {
    const { parser } = createArgsParser([
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
