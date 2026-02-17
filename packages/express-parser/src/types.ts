import type { SourceLocation } from './errors.js';

// ─── Token Types ───────────────────────────────────────────────

export enum TokenType {
  // Keywords
  SCHEMA = 'SCHEMA',
  END_SCHEMA = 'END_SCHEMA',
  ENTITY = 'ENTITY',
  END_ENTITY = 'END_ENTITY',
  TYPE = 'TYPE',
  END_TYPE = 'END_TYPE',
  FUNCTION = 'FUNCTION',
  END_FUNCTION = 'END_FUNCTION',
  PROCEDURE = 'PROCEDURE',
  END_PROCEDURE = 'END_PROCEDURE',
  RULE = 'RULE',
  END_RULE = 'END_RULE',
  SUBTYPE = 'SUBTYPE',
  SUPERTYPE = 'SUPERTYPE',
  ABSTRACT = 'ABSTRACT',
  OF = 'OF',
  ONEOF = 'ONEOF',
  ANDOR = 'ANDOR',
  AND = 'AND',
  OPTIONAL = 'OPTIONAL',
  UNIQUE = 'UNIQUE',
  DERIVE = 'DERIVE',
  INVERSE = 'INVERSE',
  WHERE = 'WHERE',
  ENUMERATION = 'ENUMERATION',
  SELECT = 'SELECT',
  BASED_ON = 'BASED_ON',
  WITH = 'WITH',
  SET = 'SET',
  LIST = 'LIST',
  BAG = 'BAG',
  ARRAY = 'ARRAY',
  INTEGER = 'INTEGER',
  REAL = 'REAL',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  LOGICAL = 'LOGICAL',
  STRING = 'STRING',
  BINARY = 'BINARY',
  GENERIC = 'GENERIC',
  GENERIC_ENTITY = 'GENERIC_ENTITY',
  SELF = 'SELF',
  FIXED = 'FIXED',
  FOR = 'FOR',
  REFERENCE = 'REFERENCE',
  FROM = 'FROM',
  LOCAL = 'LOCAL',
  END_LOCAL = 'END_LOCAL',
  CONSTANT = 'CONSTANT',
  END_CONSTANT = 'END_CONSTANT',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  END_IF = 'END_IF',
  REPEAT = 'REPEAT',
  END_REPEAT = 'END_REPEAT',
  CASE = 'CASE',
  END_CASE = 'END_CASE',
  RETURN = 'RETURN',
  VAR = 'VAR',
  END_VAR = 'END_VAR',
  ALIAS = 'ALIAS',
  END_ALIAS = 'END_ALIAS',
  SKIP = 'SKIP',
  BEGIN = 'BEGIN',
  END = 'END',
  ESCAPE = 'ESCAPE',
  OTHERWISE = 'OTHERWISE',
  QUERY = 'QUERY',
  IN = 'IN',
  LIKE = 'LIKE',
  NOT = 'NOT',
  OR = 'OR',
  XOR = 'XOR',
  MOD = 'MOD',
  DIV = 'DIV',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  UNKNOWN = 'UNKNOWN',
  TYPEOF = 'TYPEOF',
  SIZEOF = 'SIZEOF',
  LOINDEX = 'LOINDEX',
  HIINDEX = 'HIINDEX',
  LOBOUND = 'LOBOUND',
  HIBOUND = 'HIBOUND',
  ABS = 'ABS',
  ACOS = 'ACOS',
  ASIN = 'ASIN',
  ATAN = 'ATAN',
  BLENGTH = 'BLENGTH',
  COS = 'COS',
  EXISTS = 'EXISTS',
  EXP = 'EXP',
  FORMAT = 'FORMAT',
  LENGTH = 'LENGTH',
  LOG = 'LOG',
  LOG2 = 'LOG2',
  LOG10 = 'LOG10',
  NVL = 'NVL',
  ODD = 'ODD',
  ROLESOF = 'ROLESOF',
  SIN = 'SIN',
  SQRT = 'SQRT',
  TAN = 'TAN',
  USEDIN = 'USEDIN',
  VALUE = 'VALUE',
  VALUE_IN = 'VALUE_IN',
  VALUE_UNIQUE = 'VALUE_UNIQUE',
  PI = 'PI',
  CONST_E = 'CONST_E',
  INDETERMINATE = 'INDETERMINATE',
  RENAMED = 'RENAMED',
  AS = 'AS',
  TO = 'TO',
  BY = 'BY',
  EXTENSIBLE = 'EXTENSIBLE',

  // Literals & identifiers
  IDENTIFIER = 'IDENTIFIER',
  INTEGER_LITERAL = 'INTEGER_LITERAL',
  REAL_LITERAL = 'REAL_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',

  // Symbols
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  ASSIGN = 'ASSIGN',
  LT = 'LT',
  GT = 'GT',
  LE = 'LE',
  GE = 'GE',
  NE = 'NE',
  EQ = 'EQ',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  BACKSLASH = 'BACKSLASH',
  PIPE = 'PIPE',
  QUESTION = 'QUESTION',
  HASH = 'HASH',
  DOUBLESTAR = 'DOUBLESTAR',
  COMPLEXCONCAT = 'COMPLEXCONCAT',

  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

// ─── AST Node Types ────────────────────────────────────────────

export interface SchemaNode {
  kind: 'schema';
  name: string;
  declarations: Declaration[];
}

export type Declaration =
  | TypeDeclaration
  | EntityDeclaration
  | FunctionDeclaration
  | ProcedureDeclaration
  | RuleDeclaration
  | ConstantDeclaration;

export interface TypeDeclaration {
  kind: 'type';
  name: string;
  underlyingType: UnderlyingType;
  whereRules: WhereRule[];
}

export type UnderlyingType =
  | EnumerationType
  | SelectType
  | AggregationType
  | NamedTypeRef
  | SimpleType;

export interface EnumerationType {
  kind: 'enumeration';
  extensible: boolean;
  items: string[];
  basedOn?: string;
}

export interface SelectType {
  kind: 'select';
  extensible: boolean;
  items: string[];
  basedOn?: string;
}

export interface AggregationType {
  kind: 'aggregation';
  aggregateType: 'SET' | 'LIST' | 'BAG' | 'ARRAY';
  lowerBound?: string;
  upperBound?: string;
  unique?: boolean;
  elementType: UnderlyingType;
}

export interface NamedTypeRef {
  kind: 'named';
  name: string;
}

export interface SimpleType {
  kind: 'simple';
  type:
    | 'INTEGER'
    | 'REAL'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'LOGICAL'
    | 'STRING'
    | 'BINARY';
  width?: string;
  fixed?: boolean;
}

export interface EntityDeclaration {
  kind: 'entity';
  name: string;
  abstract: boolean;
  supertype?: SupertypeConstraint;
  subtypeOf: string[];
  attributes: ExplicitAttribute[];
  deriveAttributes: DeriveAttribute[];
  inverseAttributes: InverseAttribute[];
  uniqueRules: UniqueRule[];
  whereRules: WhereRule[];
}

export interface SupertypeConstraint {
  kind: 'supertype';
  expression: string;
}

export interface ExplicitAttribute {
  kind: 'explicit';
  name: string;
  optional: boolean;
  type: UnderlyingType;
}

export interface DeriveAttribute {
  kind: 'derive';
  name: string;
  type: UnderlyingType;
  expression: string;
}

export interface InverseAttribute {
  kind: 'inverse';
  name: string;
  type: InverseType;
  forEntity: string;
  forAttribute: string;
}

export interface InverseType {
  aggregateType?: 'SET' | 'BAG';
  lowerBound?: string;
  upperBound?: string;
  entityRef: string;
}

export interface UniqueRule {
  name?: string;
  attributes: string[];
}

export interface WhereRule {
  name: string;
  expression: string;
}

export interface FunctionDeclaration {
  kind: 'function';
  name: string;
  parameters: FormalParameter[];
  returnType: string;
  body: string;
}

export interface ProcedureDeclaration {
  kind: 'procedure';
  name: string;
  parameters: FormalParameter[];
  body: string;
}

export interface RuleDeclaration {
  kind: 'rule';
  name: string;
  appliesTo: string[];
  body: string;
  whereRules: WhereRule[];
}

export interface ConstantDeclaration {
  kind: 'constant';
  name: string;
  type: string;
  value: string;
}

export interface FormalParameter {
  name: string;
  type: string;
  var?: boolean;
}
