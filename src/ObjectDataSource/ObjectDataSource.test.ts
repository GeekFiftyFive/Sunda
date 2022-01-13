import { DataType } from '../CommonTypes/DataSource';
import { createObjectDataSource } from './ObjectDataSource';

describe('ObjectDataSource', () => {
  const data = {
    table1: [
      {
        name: 'Sam',
        subscribed: true,
      },
      {
        name: 'Charlie',
        age: 25,
      },
    ],
    notTable: 3,
    table2: [
      {
        name: 'Max',
        age: 27,
        contact: {
          number: 123456789,
          home: true,
        },
      },
      {
        name: 'Alex',
        age: 30,
        contact: {
          number: 123456789,
          postcode: 'ABC123',
        },
      },
    ],
  };

  const datasource = createObjectDataSource(data);

  test('getTables should only return arrays', async () => {
    const tables = await datasource.getTables();

    expect(tables).toHaveLength(2);
    expect(tables[0].name).toEqual('table1');
    expect(tables[1].name).toEqual('table2');
  });

  test('getTable should return empty Maybe when name of non table given', async () => {
    const notTable = await datasource.getTable('notTable');
    expect(notTable.isEmpty()).toBeTruthy();
  });

  test('getTable should return non Maybe when name of table given', async () => {
    const notTable = await datasource.getTable('table1');
    expect(notTable.isEmpty()).toBeFalsy();
  });

  test('readFullTable should return input array', async () => {
    const table1 = await datasource.getTable('table1');
    expect(await table1.getValue().readFullTable()).toEqual(data.table1);
  });

  test('table returned by getTable should be able to read its schema', async () => {
    const table1 = (await datasource.getTable('table1')).getValue();
    const table2 = (await datasource.getTable('table2')).getValue();

    const table1Schema = await table1.getSchema();
    const table2Schema = await table2.getSchema();

    expect(table1Schema).toEqual({
      name: DataType.String,
      age: DataType.Numeric,
      subscribed: DataType.Boolean,
    });

    expect(table2Schema).toEqual({
      name: DataType.String,
      age: DataType.Numeric,
      contact: {
        number: DataType.Numeric,
        postcode: DataType.String,
        home: DataType.Boolean,
      },
    });
  });
});
