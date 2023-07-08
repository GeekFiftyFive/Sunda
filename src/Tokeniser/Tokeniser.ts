export interface Span {
  start: number;
  end: number;
}

export interface Token {
  value: string;
  pos: Span;
  line: number; // TODO multi line support
}

export const tokenise = (input: string): Token[] => {
  const regex =
    /\s*(\*|\+|\/|-|[0-9]+\.[0-9]+|[\w|.|-]+|\w+|,|\(|\)|<=|>=|<>|<|>|=|;|"[^"]*"|'[^']*')/gim;
  const tokens = [...input.matchAll(regex)].map((match) => ({
    value: match[1],
    pos: { start: match.index, end: match.index + match[1].length },
    line: 1,
  }));
  return tokens;
};
