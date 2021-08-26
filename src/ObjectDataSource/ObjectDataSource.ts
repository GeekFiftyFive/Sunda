import { DataSource, Maybe, Table } from '../CommonTypes';

export const createObjectDataSource = (obj: Record<string, unknown>): DataSource => {
  const getTables = async (): Promise<Table[]> =>
    Object.entries(obj)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_key, value]) => Array.isArray(value))
      .map(
        ([key, value]): Table => ({
          name: key,
          readFullTable: async <T>() => value as T[],
        }),
      );
  const getTable = async (name: string) => {
    const value = obj[name];
    if (!Array.isArray(value)) {
      return Maybe.fromEmpty<Table>();
    }
    return Maybe.fromValue<Table>({
      name,
      readFullTable: async <T>() => value as T[],
    });
  };
  return {
    getTable,
    getTables,
  };
};
