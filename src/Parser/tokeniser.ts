// eslint-disable-next-line no-unused-vars
export const tokenise = (input: string): string[] => {
  const regex = /[\s,]*(SELECT|FROM|[^\s\\]+)/gm;
  return [...input.matchAll(regex)].map((match) => match[1]);
};
