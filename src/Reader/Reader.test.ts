import { read } from './Reader';

describe('test reader handles JSON objects', () => {
  test('JSON objects are parsed unchanged', () => {
    const obj = {
      test_data: [
        {
          name: 'Mo',
        },
      ],
    };

    expect(read(JSON.stringify(obj))).toEqual(obj);
  });
});

describe('test reader handles flat files', () => {
  const sourceData = [
    {
      name: 'Apple',
      type: 'Fruit',
    },
    {
      name: 'Carrot',
      type: 'Vegetable',
    },
    {
      name: 'Oyster Mushroom',
      type: 'Fungus',
    },
  ];
  test('flat files are converted into a JSON object with a single field called \'root\'', () => {
    const input = sourceData.reduce((previous, current) => `${previous}\n${JSON.stringify(current)}`, '');
    expect(read(input)).toEqual({
      root: sourceData,
    });
  });

  test('flat files with CRLF line endings are properly supported', () => {
    const input = sourceData.reduce((previous, current) => `${previous}\r\n${JSON.stringify(current)}`, '');
    expect(read(input)).toEqual({
      root: sourceData,
    });
  });
});
