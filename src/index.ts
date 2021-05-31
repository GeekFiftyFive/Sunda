import { execute } from './Executor';
import { parse } from './Parser';
import { tokenise } from './Tokeniser';

export const executeQuery = <T>(query: string, data: Record<string, unknown[]>): T[] => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
  return execute<T>(parsedQuery, data);
};
