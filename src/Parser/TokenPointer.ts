import { Token } from '../Tokeniser';

export class TokenPointer {
  private tokens: Token[];

  private pointer = 0;

  length: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.length = tokens.length;
  }

  private static raiseInternalError(message: string): void {
    throw new Error(`${message}! This is an internal error, please report on GitHub :^)`);
  }

  getRawTokens(): string[] {
    return this.getTokens().map((token) => token.value);
  }

  getTokens(): Token[] {
    return this.tokens.slice(this.pointer);
  }

  getCurrentToken(): Token {
    if (this.tokens.length === 0) {
      TokenPointer.raiseInternalError('Performing getCurrentToken would read out of bounds');
    }
    return this.tokens[this.pointer];
  }

  movePointer(offset: number): TokenPointer {
    const newPointer = this.pointer + offset;
    if (newPointer < 0 || newPointer >= this.tokens.length) {
      TokenPointer.raiseInternalError('Moving pointer by this offset would exceed array bounds');
    }
    this.pointer = newPointer;
    this.length -= offset;
    return this;
  }

  peek(offset: number): Token | undefined {
    return this.tokens[this.pointer + offset];
  }

  createSegment(startIndex: number, endIndex?: number): TokenPointer {
    const computedStartIndex = startIndex + this.pointer;
    const computedEndIndex = endIndex ? endIndex + this.pointer : this.tokens.length;
    if (computedStartIndex < 0) {
      TokenPointer.raiseInternalError('Creating this segment would exceed array bounds');
    }
    const newTokens = this.tokens.slice(computedStartIndex, computedEndIndex);
    return new TokenPointer(newTokens);
  }
}
