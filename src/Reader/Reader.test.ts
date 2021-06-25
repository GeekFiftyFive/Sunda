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
  test('flat files are converted into a JSON object with a single field called \'root\'', () => {
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
    const input = sourceData.reduce((previous, current) => `${previous}\n${JSON.stringify(current)}`, '');
    expect(read(input)).toEqual({
      root: sourceData,
    });
  });
});
