import { Token } from '../Tokeniser';
import { TokenPointer } from './TokenPointer';

describe('test token pointer', () => {
  test('Token pointer starts at beginning of token array', () => {
    const tokens: Token[] = [{ value: 'select', pos: [0, 6], line: 1 }];
    const tp = new TokenPointer(tokens);
    expect(tp.getCurrentToken()).toEqual(tokens[0]);
  });
});
