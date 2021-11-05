export interface ArgInput {
  key: string;
  default?: boolean;
  longhand?: string;
  shorthand?: string;
}

export const createArgsParser =
  (argInputs: ArgInput[]): ((args: string[]) => Record<string, string>) =>
  (args: string[]) => {
    const [shorthandMap, longhandMap] = argInputs.reduce(
      ([shorthandMap, longhandMap], current) => {
        if (current.shorthand) {
          // eslint-disable-next-line no-param-reassign
          shorthandMap[current.shorthand] = current.key;
        }

        if (current.longhand) {
          // eslint-disable-next-line no-param-reassign
          longhandMap[current.longhand] = current.key;
        }

        return [shorthandMap, longhandMap];
      },
      [{} as Record<string, string>, {} as Record<string, string>],
    );
    const defaultKey = argInputs.find((input) => input.default)?.key;
    let param: string;
    const map = args.reduce((mapped, arg) => {
      if (longhandMap[arg] || shorthandMap[arg]) {
        param = arg;
        return mapped;
      }

      if (!param && (!defaultKey || mapped[defaultKey] !== undefined)) {
        throw new Error(`Invalid flag '${arg}'`);
      }

      if (defaultKey && !param) {
        // eslint-disable-next-line no-param-reassign
        mapped[defaultKey] = arg;
      }

      if (param) {
        const key = longhandMap[param] || shorthandMap[param];
        if (!key) {
          throw new Error(`Invalid parameter '${param}'`);
        }
        // eslint-disable-next-line no-param-reassign
        mapped[key] = arg;
        param = undefined;
      }

      return mapped;
    }, {} as Record<string, string>);
    return map;
  };
