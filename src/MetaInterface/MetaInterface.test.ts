import { createObjectDataSource } from '../ObjectDataSource';
import { executeMetaCommand } from './MetaInterface';

describe('MetaInterface', () => {
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

  test('MetaInterface can execute list command', async () => {
    const mockLogger = jest.fn();
    await executeMetaCommand('list_tables', datasource, mockLogger);

    expect(mockLogger).toHaveBeenCalledTimes(2);
    expect(mockLogger).toHaveBeenNthCalledWith(1, 'table1');
    expect(mockLogger).toHaveBeenNthCalledWith(2, 'table2');
  });

  test('MetaInterface can execute dump_schema command', async () => {
    const mockLogger = jest.fn();
    await executeMetaCommand('dump_schema table1', datasource, mockLogger);

    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockLogger).toHaveBeenCalledWith({
      name: 'string',
      subscribed: 'boolean',
      age: 'numeric',
    });

    mockLogger.mockReset();

    await executeMetaCommand('dump_schema table2', datasource, mockLogger);

    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockLogger).toHaveBeenCalledWith({
      name: 'string',
      age: 'numeric',
      contact: {
        number: 'numeric',
        home: 'boolean',
        postcode: 'string',
      },
    });
  });
});
