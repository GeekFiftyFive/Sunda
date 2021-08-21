// eslint-disable-next-line no-unused-vars
export const tokenise = (input: string): string[] => {
  const regex = /\s*(\*|[0-9]+\.[0-9]+|[\w|.|-]+|\w+|,|\(|\)|<=|>=|<>|<|>|=|;|"[^".]*"|'[^'.]*')/gmi;
  return [...input.matchAll(regex)].map((match) => match[1]);
};
