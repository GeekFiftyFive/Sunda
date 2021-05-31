import { parse, ProjectionType } from './parser';

describe('test parser', () => {
  test('parse simple valid query', () => {
    const tokens = ['SELECT', '*', 'FROM', 'tableName'];
    const query = parse(tokens);

    expect(query).toEqual({
      projection: {
        type: ProjectionType.ALL,
      },
      table: 'tableName',
    });
  });
});
