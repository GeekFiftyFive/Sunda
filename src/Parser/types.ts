export enum BooleanType {
  AND = 'AND',
  OR = 'OR',
  NONE = 'NONE',
  NOT = 'NOT',
}

export enum Comparison {
  EQ = '=',
  NEQ = '<>',
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  BETWEEN = 'BETWEEN',
  LIKE = 'LIKE',
  IN = 'IN',
}

export enum FunctionName {
  ARRAY_POSITION = 'ARRAY_POSITION',
  ARRAY_LENGTH = 'ARRAY_LENGTH',
  COALESCE = 'COALESCE',
  REGEX_GROUP = 'REGEX_GROUP',
  PARSE_NUMBER = 'PARSE_NUMBER',
}

export enum DataSetType {
  TABLE,
  SUBQUERY,
}

export enum ProjectionType {
  ALL,
  SELECTED,
  DISTINCT,
  FUNCTION,
}

export enum AggregateType {
  NONE,
  COUNT,
  SUM,
  AVG,
}

export enum NumericOperation {
  MULTIPLY = '*',
  DIVIDE = '/',
  ADD = '+',
  SUBTRACT = '-',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface Join {
  table: string;
  alias?: string;
}

export interface Condition {
  boolean: BooleanType;
}

export interface Value {
  type: 'FIELD' | 'LITERAL' | 'FUNCTION_RESULT' | 'EXPRESSION' | 'SUBQUERY';
}

export interface FieldValue extends Value {
  type: 'FIELD';
  fieldName: string;
}

export interface LiteralValue extends Value {
  type: 'LITERAL';
  value: unknown;
}

export interface FunctionResultValue extends Value {
  type: 'FUNCTION_RESULT';
  functionName: FunctionName;
  args: Value[];
}

export interface ExpressionValue extends Value {
  type: 'EXPRESSION';
  chain: (Value | NumericOperation)[];
}

export interface SubqueryValue extends Value {
  type: 'SUBQUERY';
  // eslint-disable-next-line no-use-before-define
  query: Query;
}

export interface LimitAndOffset {
  limit?: Value;
  offset?: Value;
}

export interface SingularCondition extends Condition {
  comparison: Comparison;
  lhs: Value;
  rhs: Value;
}

export interface ConditionPair extends Condition {
  lhs: Condition;
  rhs: Condition;
}

export interface Projection {
  type: ProjectionType;
  values?: Value[];
  function?: FunctionResultValue;
}

export interface DataSet {
  type: DataSetType;
  // eslint-disable-next-line no-use-before-define
  value: string | Query;
  alias?: string;
}

export interface Ordering {
  field: string;
  order: Order;
}

export interface ParserError extends Error {
  pos: [number, number];
  message: string;
  suggestion?: string;
}

export interface Query {
  projection: Projection;
  aggregation: AggregateType;
  dataset: DataSet;
  joins: Join[];
  condition?: Condition;
  ordering?: Ordering;
  limitAndOffset?: LimitAndOffset;
}
