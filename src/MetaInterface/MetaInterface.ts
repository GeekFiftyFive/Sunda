import { logger } from '../CommonTypes/Logger';
import { DataSource, DataType, Schema } from '../CommonTypes/DataSource';
import { tokenise } from '../Tokeniser';

interface PrintableSchema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [key: string]: string | PrintableSchema;
}

export const executeMetaCommand = async (
  command: string,
  datasource: DataSource,
  logFunction: logger,
): Promise<void> => {
  const tokens = tokenise(command);

  if (tokens.length === 1 && tokens[0] === 'list_tables') {
    const tables = await datasource.getTables();

    tables.forEach((table) => {
      logFunction(table.name);
    });
  }

  if (tokens.length > 1 && tokens[0] === 'dump_schema') {
    const tableName = tokens[1];

    const maybeTable = await datasource.getTable(tableName);

    if (maybeTable.isEmpty()) {
      throw new Error(`Could not find table with name ${tableName}`);
    }

    const table = maybeTable.getValue();

    const getPrintableSchema = (schema: Schema): PrintableSchema =>
      Object.entries(schema).reduce((printableSchema, [key, value]) => {
        const stringifiedValues: Record<DataType, string> = {
          [DataType.String]: 'string',
          [DataType.Numeric]: 'numeric',
          [DataType.Boolean]: 'boolean',
        };

        if (typeof value !== 'object') {
          return { ...printableSchema, [key]: stringifiedValues[value as DataType] };
        }

        return { ...printableSchema, [key]: getPrintableSchema(value) };
      }, {} as PrintableSchema);

    const printableSchema = getPrintableSchema(await table.getSchema());

    logFunction(printableSchema);
  }
};
