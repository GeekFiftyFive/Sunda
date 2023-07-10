export enum ReservedWords {
  SELECT = 'SELECT',
  FROM = 'FROM',
  WHERE = 'WHERE',
  ORDER = 'ORDER',
  BY = 'BY',
  GROUP = 'GROUP',
  ON = 'ON',
  JOIN = 'JOIN',
  DISTINCT = 'DISTINCT',
  OR = 'OR',
  AND = 'AND',
  LIKE = 'LIKE',
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  LIMIT = 'LIMIT',
  OFFSET = 'OFFSET',
  AS = 'AS',
  NOT = 'NOT',
}

export interface Token {
  value: string;
  pos: [number, number];
  line: number; // TODO multi line support
}

export const tokenise = (input: string): Token[] => {
  const regex =
    /\s*(\*|\+|\/|-|[0-9]+\.[0-9]+|[\w|.|-]+|\w+|,|\(|\)|<=|>=|<>|<|>|=|;|"[^"]*"|'[^']*')/gim;
  const tokens = [...input.matchAll(regex)].map<Token>((match) => ({
    value: Object.keys(ReservedWords).includes(match[1].toLocaleUpperCase())
      ? match[1].toLocaleUpperCase()
      : match[1],
    pos: [match.index, match.index + match[1].length],
    line: 1,
  }));
  return tokens;
};
