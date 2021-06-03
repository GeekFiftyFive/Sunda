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

  test('can tokenise all comparison operators', () => {
    const actual = tokenise('= <= >= <> > < BETWEEN LIKE');
    expect(actual).toEqual(['=', '<=', '>=', '<>', '>', '<', 'BETWEEN', 'LIKE']);
  });

  test('can tokenise integers', () => {
    const actual = tokenise('42');
    expect(actual).toEqual(['42']);
  });

  test('can tokenise decimals', () => {
    const actual = tokenise('3.14');
    expect(actual).toEqual(['3.14']);
  });

  test('can tokenise two string conditions', () => {
    const actual = tokenise('select * from cats where breed = "British Shorthair" or breed = "Bengal"');
    expect(actual).toEqual(['select', '*', 'from', 'cats', 'where', 'breed', '=', '"British Shorthair"', 'or', 'breed', '=', '"Bengal"']);
  });

  test('can tokenise JSON path field names', () => {
    const actual = tokenise('SELECT * FROM table WHERE field.subfield="value";');
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table', 'WHERE', 'field.subfield', '=', '"value"', ';']);
  });
});
