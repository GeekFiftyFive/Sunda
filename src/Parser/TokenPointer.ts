import { Token } from '../Tokeniser';

export class TokenPointer {
  private tokens: Token[];

  private pointer = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private static raiseInternalError(message: string): void {
    throw new Error(`${message}! This is an internal error, please report on GitHub :^)`);
  }

  getTokens(): Token[] {
    return this.tokens;
  }

  getCurrentToken(): Token {
    return this.tokens[this.pointer];
  }

  move(offset: number): void {
    const newPointer = this.pointer + offset;
    if (newPointer < 0 || newPointer >= this.tokens.length) {
      TokenPointer.raiseInternalError('Moving pointer by this offset would exceed array bounds');
    }
    this.pointer = newPointer;
  }

  createSegment(startIndex: number, endIndex: number): TokenPointer {
    if (startIndex < 0 || endIndex >= this.tokens.length) {
      TokenPointer.raiseInternalError('Creating this segment would exceed array bounds');
    }
    const newTokens = this.tokens.slice(startIndex, endIndex + 1);
    return new TokenPointer(newTokens);
  }
}
