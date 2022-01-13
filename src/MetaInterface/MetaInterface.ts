import { logger } from '../CommonTypes/Logger';
import { DataSource, DataType, Schema } from '../CommonTypes/DataSource';
import { tokenise } from '../Tokeniser';

interface PrintableSchema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [key: string]: string | PrintableSchema;
}

const commandMappings: Record<
  string,
  (datasource: DataSource, logFunction: logger, args: string[]) => Promise<void>
> = {
  list_tables: async (datasource, logFunction) => {
    const tables = await datasource.getTables();

    tables.forEach((table) => {
      logFunction(table.name);
    });
  },
  dump_schema: async (datasource, logFunction, args) => {
    if (args.length !== 1) {
      throw new Error("Invalid arguments for MetaCommand 'dump_schema'");
    }

    const tableName = args[0];

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
  },
  help: async (_datasource, logFunction) => {
    const prompts: string[] = [
      'MetaInterface Usage: !<command> [args]',
      '',
      'Commands:',
      'list_tables                 List all tables in the datasource',
      'dump_schema <table_name>    Dump the schema for the table with name <table_name>',
      'help                        Print MetaInterface command usage instructions',
    ];

    prompts.forEach((prompt) => logFunction(prompt));
  },
};

export const executeMetaCommand = async (
  command: string,
  datasource: DataSource,
  logFunction: logger,
): Promise<void> => {
  const tokens = tokenise(command);

  if (tokens.length < 1) {
    throw new Error('Empty command passed to MetaInterface');
  }

  const method = commandMappings[tokens[0]];

  if (!method) {
    throw new Error(`Invalid Meta command '${tokens[0]}'`);
  }

  await method(datasource, logFunction, tokens.slice(1));
};
