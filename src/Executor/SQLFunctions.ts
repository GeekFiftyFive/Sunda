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
};
