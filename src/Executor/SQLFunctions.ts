import { FunctionName } from '../Parser';

export const functions: Record<FunctionName, (...args: unknown[]) => unknown> = {
  ARRAY_POSITION: (...args) => {
    if (args.length < 2) {
      throw new Error("Incorrect number of arguments passed to 'ARRAY_POSITION'");
    }

    const arrayToSearch = args[0];
    const searchValue = args[1];
    let startIndex = 0;

    if (args.length > 2) {
      if (typeof args[2] === 'number') {
        startIndex = args[2] - 1;
      } else {
        throw new Error("Expected 3rd parameter passed to 'ARRAY_POSITION' to be numeric");
      }
    }

    if (!Array.isArray(arrayToSearch)) {
      throw new Error("Expected second argument to 'ARRAY_POSITION' to refer to an array");
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
  REGEX_GROUP: (...args) => {
    if (args.length < 3) {
      throw new Error("Incorrect number of arguments passed to 'REGEX_GROUP'");
    }

    if (args.filter((arg) => arg === undefined).length > 0) {
      return undefined;
    }

    if (typeof args[0] !== 'string' || typeof args[1] !== 'string' || typeof args[2] !== 'number') {
      throw new Error("Incorrect arguemnt type for 'REGEX_GROUP'");
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
      throw new Error("Incorrect number of arguments passed to 'PARSE_NUMBER'");
    }

    const str = args[0];

    if (typeof str !== 'string') {
      throw new Error("Incorrect argument type for 'PARSE_NUMBER'");
    }

    return parseFloat(str);
  },
};
