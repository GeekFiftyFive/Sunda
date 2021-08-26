import { createObjectDataSource } from './ObjectDataSource';

describe('ObjectDataSource', () => {
  const data = {
    table1: [
      {
        name: 'Sam',
      },
      {
        name: 'Charlie',
      },
    ],
    notTable: 3,
    table2: [
      {
        name: 'Max',
      },
      {
        name: 'Alex',
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
});
