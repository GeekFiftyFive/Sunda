import { tokenise } from './tokeniser';

describe('test tokeniser', () => {
  test('valid input returns valid tokens', () => {
    const actual = tokenise('SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });
});
