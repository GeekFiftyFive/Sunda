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

  test('tokenise valid simple command with single quotes', () => {
    const actual = tokenise("SELECT * FROM table WHERE field='value';");
    expect(actual).toEqual(['SELECT', '*', 'FROM', 'table', 'WHERE', 'field', '=', "'value'", ';']);
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
    const actual = tokenise(
      'select * from cats where breed = \'British Shorthair\' or breed = "Bengal"',
    );
    expect(actual).toEqual([
      'select',
      '*',
      'from',
      'cats',
      'where',
      'breed',
      '=',
      "'British Shorthair'",
      'or',
      'breed',
      '=',
      '"Bengal"',
    ]);
  });

  test('can tokenise JSON path field names', () => {
    const actual = tokenise('SELECT * FROM table WHERE field.subfield="value";');
    expect(actual).toEqual([
      'SELECT',
      '*',
      'FROM',
      'table',
      'WHERE',
      'field.subfield',
      '=',
      '"value"',
      ';',
    ]);
  });

  test('can tokenise projections', () => {
    const actual = tokenise('SELECT name, age  FROM table;');
    expect(actual).toEqual(['SELECT', 'name', ',', 'age', 'FROM', 'table', ';']);
  });

  test('can tokenise field names with no alphanumeric characters', () => {
    const actual = tokenise('SELECT first-name, last-name FROM cool_people;');
    expect(actual).toEqual(['SELECT', 'first-name', ',', 'last-name', 'FROM', 'cool_people', ';']);
  });

  test('can tokenise aggregate functions', () => {
    const actual = tokenise('SELECT COUNT(DISTINCT colour) FROM furniture;');
    expect(actual).toEqual([
      'SELECT',
      'COUNT',
      '(',
      'DISTINCT',
      'colour',
      ')',
      'FROM',
      'furniture',
      ';',
    ]);
  });

  test('can tokenise string containing special characters', () => {
    const actual = tokenise('SELECT * FROM fruit WHERE price.exVAT="£0.30"');
    expect(actual).toEqual([
      'SELECT',
      '*',
      'FROM',
      'fruit',
      'WHERE',
      'price.exVAT',
      '=',
      '"£0.30"',
    ]);
  });

  test('can tokenise a basic join', () => {
    const actual = tokenise(
      'SELECT * FROM posts JOIN users WHERE posts.PosterID = users.ID and users.Name = "George"',
    );
    expect(actual).toEqual([
      'SELECT',
      '*',
      'FROM',
      'posts',
      'JOIN',
      'users',
      'WHERE',
      'posts.PosterID',
      '=',
      'users.ID',
      'and',
      'users.Name',
      '=',
      '"George"',
    ]);
  });
});
