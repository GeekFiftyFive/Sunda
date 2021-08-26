import { Maybe } from './Maybe';

export interface Table {
  name: string;
  readFullTable: <T>() => Promise<T[]>;
}

export interface DataSource {
  getTables: () => Promise<Table[]>;
  getTable: (name: string) => Promise<Maybe<Table>>;
}
