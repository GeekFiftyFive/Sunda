import { Maybe } from './Maybe';

export enum DataType {
  String,
  Numeric,
  Boolean,
}
export interface Schema {
  [key: string]: DataType | Schema;
}

export interface Table {
  name: string;
  readFullTable: <T>() => Promise<T[]>;
  getSchema: () => Promise<Schema>;
}

export interface DataSource {
  getTables: () => Promise<Table[]>;
  getTable: (name: string) => Promise<Maybe<Table>>;
}
