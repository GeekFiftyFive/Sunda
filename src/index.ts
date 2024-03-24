import { execute } from './Executor';
import { parse } from './Parser';
import { tokenise } from './Tokeniser';
import { createObjectDataSource } from './ObjectDataSource';
import { DataSource } from './CommonTypes';

export * from './CommonTypes';

export const executeQuery = async <T>(query: string, datasource: DataSource): Promise<T[]> => {
  const tokens = tokenise(query);
  const parsedQuery = parse(tokens);
  return execute<T>(parsedQuery, datasource);
};

export const executeQueryFromObject = async <T>(
  query: string,
  data: Record<string, unknown[]>,
): Promise<T[]> => executeQuery<T>(query, createObjectDataSource(data));
