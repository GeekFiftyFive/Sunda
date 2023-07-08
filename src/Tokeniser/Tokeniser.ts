export interface Token {
  value: string;
  pos: [number, number];
  line: number; // TODO multi line support
}

export const tokenise = (input: string): Token[] => {
  const regex =
    /\s*(\*|\+|\/|-|[0-9]+\.[0-9]+|[\w|.|-]+|\w+|,|\(|\)|<=|>=|<>|<|>|=|;|"[^"]*"|'[^']*')/gim;
  const tokens = [...input.matchAll(regex)].map<Token>((match) => ({
    value: match[1],
    pos: [match.index, match.index + match[1].length],
    line: 1,
  }));
  return tokens;
};
