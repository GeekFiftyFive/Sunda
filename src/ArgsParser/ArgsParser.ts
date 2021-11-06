export interface ArgInput {
  key: string;
  default?: boolean;
  longhand?: string;
  shorthand?: string;
  description?: string;
  noInput?: boolean;
}

type logger = (input: string) => void;

export const createArgsParser = (
  argInputs: ArgInput[],
): {
  parser: (args: string[]) => Record<string, string | boolean>;
  dumpUsage: (name: string, logFunction: logger) => void;
} => ({
  dumpUsage: (name: string, logFunction: logger) => {
    const getFlagString = (input: ArgInput) =>
      `${input.longhand || ''}${input.longhand ? ', ' : ''}${input.shorthand || ''}`;

    const longestFlagsLength = argInputs.reduce((longest, current) => {
      const flagString = getFlagString(current);
      if (flagString.length > longest) {
        return flagString.length;
      }

      return longest;
    }, 0);

    const defaultInput = argInputs.find((input) => input.default);

    const usage = argInputs.reduce(
      (usage, current) =>
        !current.default
          ? `${usage} [${current.longhand || ''} ${current.longhand ? '| ' : ''}${
              current.shorthand || ''
            }]`
          : usage,
      `Usage: ${name} ${defaultInput ? `<${defaultInput.description}>` : ''}`,
    );

    logFunction(usage);
    logFunction('');

    argInputs.forEach((input) => {
      if (input.default) {
        return;
      }
      const flagString = getFlagString(input);
      let padding = '';

      for (let i = 0; i < longestFlagsLength - flagString.length + 4; i += 1) {
        padding += ' ';
      }

      logFunction(`${flagString}${padding}${input.description}`);
    });
  },
  parser: (args: string[]) => {
    const [shorthandMap, longhandMap, noInputs] = argInputs.reduce(
      ([shorthandMap, longhandMap, noInputs], current) => {
        if (current.shorthand) {
          // eslint-disable-next-line no-param-reassign
          shorthandMap[current.shorthand] = current.key;
        }

        if (current.longhand) {
          // eslint-disable-next-line no-param-reassign
          longhandMap[current.longhand] = current.key;
        }

        // eslint-disable-next-line no-param-reassign
        noInputs[current.key] = !!current.noInput;

        return [shorthandMap, longhandMap, noInputs];
      },
      [{} as Record<string, string>, {} as Record<string, string>, {} as Record<string, boolean>],
    );
    const defaultKey = argInputs.find((input) => input.default)?.key;
    let param: string;
    const map = args.reduce((mapped, arg) => {
      if (longhandMap[arg] || shorthandMap[arg]) {
        const key = longhandMap[arg] || shorthandMap[arg];
        if (noInputs[key]) {
          // eslint-disable-next-line no-param-reassign
          mapped[key] = true;
          return mapped;
        }
        param = arg;
        return mapped;
      }

      if (!param && (!defaultKey || mapped[defaultKey])) {
        throw new Error(`Invalid flag '${arg}'`);
      }

      if (defaultKey && !param) {
        // eslint-disable-next-line no-param-reassign
        mapped[defaultKey] = arg;
      }

      if (param) {
        const key = longhandMap[param] || shorthandMap[param];
        // eslint-disable-next-line no-param-reassign
        mapped[key] = arg;
        param = undefined;
      }

      return mapped;
    }, {} as Record<string, string | boolean>);
    return map;
  },
});
