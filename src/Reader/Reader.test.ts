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
