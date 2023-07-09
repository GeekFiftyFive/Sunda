import { Token } from '../Tokeniser';
import { TokenPointer } from './TokenPointer';

// TODO: Find a nicer way of doing this
const addSpanInfo = (tokens: string[]): Token[] =>
  tokens.map((token) => ({
    value: token,
    pos: [0, 0],
    line: 1,
  }));

describe('test token pointer', () => {
  test('Token pointer starts at beginning of token array', () => {
    const tokens: Token[] = [{ value: 'select', pos: [0, 6], line: 1 }];
    const tp = new TokenPointer(tokens);
    expect(tp.getCurrentToken()).toEqual(tokens[0]);
  });

  test('Token pointer can move pointer by given offset', () => {
    const tokens: Token[] = [
      { value: 'select', pos: [0, 6], line: 1 },
      { value: '*', pos: [7, 8], line: 1 },
    ];
    const tp = new TokenPointer(tokens);
    expect(tp.getCurrentToken()).toEqual(tokens[0]);
    tp.move(1);
    expect(tp.getCurrentToken()).toEqual(tokens[1]);
  });

  test('Token pointer can create segments', () => {
    const tokens = addSpanInfo(['select', '*', 'from', 'tables']);
    const tp = new TokenPointer(tokens);
    const segment = tp.createSegment(1, 2);
    expect(segment.getTokens()).toEqual([tokens[1], tokens[2]]);
  });
});
