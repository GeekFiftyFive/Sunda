import { tokenise } from './Tokeniser';

describe('test tokeniser', () => {
  test('tokenise valid simple command', () => {
    const actual = tokenise('SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });

  test('tokenise valid simple command with leading whitspace', () => {
    const actual = tokenise('  SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });
});
