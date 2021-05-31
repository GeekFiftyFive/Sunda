import { parse, tokenise } from './Parser';

export const exectueQuery = (query: string, data: Record<string, unknown>): void => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
};
