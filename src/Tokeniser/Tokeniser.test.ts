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

  test('can tokenise subfields in select statement', () => {
    const actual = tokenise(
      "SELECT address.line1 FROM users WHERE address.line1 = '123 Street Lane'",
    );
    expect(actual).toEqual([
      'SELECT',
      'address.line1',
      'FROM',
      'users',
      'WHERE',
      'address.line1',
      '=',
      "'123 Street Lane'",
    ]);
  });

  test('can tokenise subfields in distinct statement', () => {
    const actual = tokenise(
      "SELECT DISTINCT address.line1 FROM users WHERE address.line1 = '123 Street Lane'",
    );
    expect(actual).toEqual([
      'SELECT',
      'DISTINCT',
      'address.line1',
      'FROM',
      'users',
      'WHERE',
      'address.line1',
      '=',
      "'123 Street Lane'",
    ]);
  });

  test('can tokenise join with no constraint on joined table', () => {
    const actual = tokenise(
      'SELECT DISTINCT users.name FROM posts JOIN users WHERE posts.posterId = users.id AND posts.views >= 10',
    );

    expect(actual).toEqual([
      'SELECT',
      'DISTINCT',
      'users.name',
      'FROM',
      'posts',
      'JOIN',
      'users',
      'WHERE',
      'posts.posterId',
      '=',
      'users.id',
      'AND',
      'posts.views',
      '>=',
      '10',
    ]);
  });

  test('can tokenise in operator with numerical values', () => {
    const actual = tokenise('SELECT * FROM posts WHERE ID IN (1, 3)');
    expect(actual).toEqual([
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'ID',
      'IN',
      '(',
      '1',
      ',',
      '3',
      ')',
    ]);
  });

  test('can tokenise in operator with string values', () => {
    const actual = tokenise("SELECT * FROM posts WHERE Title IN ('Hello, world', 'Goodbye all!')");
    expect(actual).toEqual([
      'SELECT',
      '*',
      'FROM',
      'posts',
      'WHERE',
      'Title',
      'IN',
      '(',
      "'Hello, world'",
      ',',
      "'Goodbye all!'",
      ')',
    ]);
  });
});
