import { tokenise } from './Tokeniser';

describe('test tokeniser', () => {
  test('tokenise valid simple command', () => {
    const actual = tokenise('SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });

  test('tokenise valid simple command in lowercase', () => {
    const actual = tokenise('select * from table');
    expect(actual).toEqual(['select', '*', 'from', 'table']);
  });

  test('tokenise valid simple command with leading whitspace', () => {
    const actual = tokenise('  SELECT * FROM table');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table']);
  });

  test('tokenise valid simple command with simple where condition', () => {
    const actual = tokenise('SELECT * FROM table WHERE field="value";');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table', 'WHERE', 'field', '=', '"value"', ';']);
  });
});
