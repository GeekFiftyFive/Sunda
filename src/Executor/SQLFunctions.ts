import { FunctionName } from '../Parser';

const getArgCountError = (functionName: string): Error =>
  new Error(`Incorrect number of arguments passed to '${functionName}'`);

const getArgTypeError = (positionName: string, functionName: string, typeName: string): Error =>
  new Error(`Expected ${positionName} passed to ${functionName} to be of type '${typeName}'`);

export const functions: Record<FunctionName, (...args: unknown[]) => unknown> = {
  ARRAY_POSITION: (...args) => {
    if (args.length < 2) {
      throw getArgCountError('ARRAY_POSITION');
    }

    const arrayToSearch = args[0];
    const searchValue = args[1];
    let startIndex = 0;

    if (args.length > 2) {
      if (typeof args[2] === 'number') {
        startIndex = args[2] - 1;
      } else {
        throw getArgTypeError('third', 'ARRAY_POSITION', 'numeric');
      }
    }

    if (!Array.isArray(arrayToSearch)) {
      throw getArgTypeError('first', 'ARRAY_POSITION', 'array');
    }

    const index =
      (arrayToSearch as unknown[])
        .slice(startIndex)
        .findIndex((setValue) => setValue === searchValue) + startIndex;

    if (index < 0) {
      return null;
    }

    return index + 1;
  },
  ARRAY_LENGTH: (...args) => {
    if (args.length > 1) {
      throw getArgCountError('ARRAY_LENGTH');
    }

    if (!Array.isArray(args[0])) {
      throw getArgTypeError('first', 'ARRAY_LENGTH', 'array');
    }

    return args[0].length;
  },
  COALESCE: (...args) => args.find((item) => item !== null && item !== undefined),
  REGEX_GROUP: (...args) => {
    if (args.length < 3) {
      throw getArgCountError('REGEX_GROUP');
    }

    if (args.filter((arg) => arg === undefined).length > 0) {
      return undefined;
    }

    if (typeof args[0] !== 'string' || typeof args[1] !== 'string' || typeof args[2] !== 'number') {
      throw new Error("Incorrect argument type for 'REGEX_GROUP'");
    }

    if (typeof args[0] !== 'string') {
      throw getArgTypeError('first', 'REGEX_GROUP', 'string');
    }

    if (typeof args[1] !== 'string') {
      throw getArgTypeError('second', 'REGEX_GROUP', 'string');
    }

    if (typeof args[2] !== 'number') {
      throw getArgTypeError('third', 'REGEX_GROUP', 'number');
    }

    const regex = args[0];
    const toMatch = args[1];
    const groupIndexToReturn = args[2];

    if (groupIndexToReturn < 1) {
      throw new Error('Index must begin at 1');
    }

    const compiledRegex = new RegExp(regex);

    const value = compiledRegex.exec(toMatch);

    if (!value) {
      return undefined;
    }

    return value[groupIndexToReturn];
  },
  PARSE_NUMBER: (...args) => {
    if (args.length !== 1) {
      throw getArgCountError('PARSE_NUMBER');
    }

    const str = args[0];

    if (typeof str !== 'string') {
      throw getArgTypeError('first', 'PARSE_NUMBER', 'string');
    }

    return parseFloat(str);
  },
  PARSE_DATE: (...args) => {
    if (args.length !== 1) {
      throw getArgCountError('PARSE_DATE');
    }
    const str = args[0];

    if (typeof str !== 'string') {
      throw getArgTypeError('first', 'PARSE_DATE', 'string');
    }

    return new Date(str);
  },
};
