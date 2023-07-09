import { Token } from '../Tokeniser';

export class TokenPointer {
  private tokens: Token[];

  private pointer = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  getCurrentToken(): Token {
    return this.tokens[this.pointer];
  }
}
