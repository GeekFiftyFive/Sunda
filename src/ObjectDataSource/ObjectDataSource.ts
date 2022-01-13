import { DataSource, DataType, Maybe, Schema, Table } from '../CommonTypes';

export const createObjectDataSource = (obj: Record<string, unknown>): DataSource => {
  const getItemSchema = (value: Record<string, unknown>): Schema =>
    Object.entries(value).reduce((schema, [currentKey, currentValue]) => {
      const types: Record<string, DataType> = {
        string: DataType.String,
        number: DataType.Numeric,
        boolean: DataType.Boolean,
      };

      const dataTypeOrSchema =
        typeof currentValue === 'object'
          ? getItemSchema(currentValue as Record<string, unknown>)
          : types[typeof currentValue as string];

      return { ...schema, [currentKey]: dataTypeOrSchema };
    }, {} as Schema);

  const combineSchemas = (schema1: Schema, schema2: Schema): Schema => {
    if (!schema1) {
      return schema2;
    }

    const schema = schema1;

    Object.entries(schema2).forEach(([key, value]) => {
      schema[key] =
        typeof value === 'object' ? combineSchemas(schema1[key] as Schema, value) : value;
    });

    return schema;
  };

  const getSchema = (values: Record<string, unknown>[]): Schema => {
    let schema: Schema = {};

    values.forEach((value) => {
      schema = combineSchemas(schema, getItemSchema(value));
    });

    return schema;
  };
  const getTables = async (): Promise<Table[]> =>
    Object.entries(obj)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_key, value]) => Array.isArray(value))
      .map(
        ([key, value]): Table => ({
          name: key,
          readFullTable: async <T>() => value as T[],
          getSchema: async () => getSchema(value as Record<string, unknown>[]),
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
      getSchema: async () => getSchema(value as Record<string, unknown>[]),
    });
  };
  return {
    getTable,
    getTables,
  };
};
