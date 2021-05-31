import { tokenise } from './tokeniser';

describe('test tokeniser', () => {
  test('tokenise valid simple command', () => {
    const actual = tokenise('SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });
});
