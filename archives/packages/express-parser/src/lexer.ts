import { ParseError } from './errors.js';
import { type Token, TokenType } from './types.js';

const KEYWORDS: ReadonlyMap<string, TokenType> = new Map([
  ['SCHEMA', TokenType.SCHEMA],
  ['END_SCHEMA', TokenType.END_SCHEMA],
  ['ENTITY', TokenType.ENTITY],
  ['END_ENTITY', TokenType.END_ENTITY],
  ['TYPE', TokenType.TYPE],
  ['END_TYPE', TokenType.END_TYPE],
  ['FUNCTION', TokenType.FUNCTION],
  ['END_FUNCTION', TokenType.END_FUNCTION],
  ['PROCEDURE', TokenType.PROCEDURE],
  ['END_PROCEDURE', TokenType.END_PROCEDURE],
  ['RULE', TokenType.RULE],
  ['END_RULE', TokenType.END_RULE],
  ['SUBTYPE', TokenType.SUBTYPE],
  ['SUPERTYPE', TokenType.SUPERTYPE],
  ['ABSTRACT', TokenType.ABSTRACT],
  ['OF', TokenType.OF],
  ['ONEOF', TokenType.ONEOF],
  ['ANDOR', TokenType.ANDOR],
  ['AND', TokenType.AND],
  ['OPTIONAL', TokenType.OPTIONAL],
  ['UNIQUE', TokenType.UNIQUE],
  ['DERIVE', TokenType.DERIVE],
  ['INVERSE', TokenType.INVERSE],
  ['WHERE', TokenType.WHERE],
  ['ENUMERATION', TokenType.ENUMERATION],
  ['SELECT', TokenType.SELECT],
  ['BASED_ON', TokenType.BASED_ON],
  ['WITH', TokenType.WITH],
  ['SET', TokenType.SET],
  ['LIST', TokenType.LIST],
  ['BAG', TokenType.BAG],
  ['ARRAY', TokenType.ARRAY],
  ['INTEGER', TokenType.INTEGER],
  ['REAL', TokenType.REAL],
  ['NUMBER', TokenType.NUMBER],
  ['BOOLEAN', TokenType.BOOLEAN],
  ['LOGICAL', TokenType.LOGICAL],
  ['STRING', TokenType.STRING],
  ['BINARY', TokenType.BINARY],
  ['GENERIC', TokenType.GENERIC],
  ['GENERIC_ENTITY', TokenType.GENERIC_ENTITY],
  ['SELF', TokenType.SELF],
  ['FIXED', TokenType.FIXED],
  ['FOR', TokenType.FOR],
  ['REFERENCE', TokenType.REFERENCE],
  ['FROM', TokenType.FROM],
  ['LOCAL', TokenType.LOCAL],
  ['END_LOCAL', TokenType.END_LOCAL],
  ['CONSTANT', TokenType.CONSTANT],
  ['END_CONSTANT', TokenType.END_CONSTANT],
  ['IF', TokenType.IF],
  ['THEN', TokenType.THEN],
  ['ELSE', TokenType.ELSE],
  ['END_IF', TokenType.END_IF],
  ['REPEAT', TokenType.REPEAT],
  ['END_REPEAT', TokenType.END_REPEAT],
  ['CASE', TokenType.CASE],
  ['END_CASE', TokenType.END_CASE],
  ['RETURN', TokenType.RETURN],
  ['VAR', TokenType.VAR],
  ['END_VAR', TokenType.END_VAR],
  ['ALIAS', TokenType.ALIAS],
  ['END_ALIAS', TokenType.END_ALIAS],
  ['SKIP', TokenType.SKIP],
  ['BEGIN', TokenType.BEGIN],
  ['END', TokenType.END],
  ['ESCAPE', TokenType.ESCAPE],
  ['OTHERWISE', TokenType.OTHERWISE],
  ['QUERY', TokenType.QUERY],
  ['IN', TokenType.IN],
  ['LIKE', TokenType.LIKE],
  ['NOT', TokenType.NOT],
  ['OR', TokenType.OR],
  ['XOR', TokenType.XOR],
  ['MOD', TokenType.MOD],
  ['DIV', TokenType.DIV],
  ['TRUE', TokenType.TRUE],
  ['FALSE', TokenType.FALSE],
  ['UNKNOWN', TokenType.UNKNOWN],
  ['TYPEOF', TokenType.TYPEOF],
  ['SIZEOF', TokenType.SIZEOF],
  ['LOINDEX', TokenType.LOINDEX],
  ['HIINDEX', TokenType.HIINDEX],
  ['LOBOUND', TokenType.LOBOUND],
  ['HIBOUND', TokenType.HIBOUND],
  ['ABS', TokenType.ABS],
  ['ACOS', TokenType.ACOS],
  ['ASIN', TokenType.ASIN],
  ['ATAN', TokenType.ATAN],
  ['BLENGTH', TokenType.BLENGTH],
  ['COS', TokenType.COS],
  ['EXISTS', TokenType.EXISTS],
  ['EXP', TokenType.EXP],
  ['FORMAT', TokenType.FORMAT],
  ['LENGTH', TokenType.LENGTH],
  ['LOG', TokenType.LOG],
  ['LOG2', TokenType.LOG2],
  ['LOG10', TokenType.LOG10],
  ['NVL', TokenType.NVL],
  ['ODD', TokenType.ODD],
  ['ROLESOF', TokenType.ROLESOF],
  ['SIN', TokenType.SIN],
  ['SQRT', TokenType.SQRT],
  ['TAN', TokenType.TAN],
  ['USEDIN', TokenType.USEDIN],
  ['VALUE', TokenType.VALUE],
  ['VALUE_IN', TokenType.VALUE_IN],
  ['VALUE_UNIQUE', TokenType.VALUE_UNIQUE],
  ['PI', TokenType.PI],
  ['CONST_E', TokenType.CONST_E],
  ['INDETERMINATE', TokenType.INDETERMINATE],
  ['RENAMED', TokenType.RENAMED],
  ['AS', TokenType.AS],
  ['TO', TokenType.TO],
  ['BY', TokenType.BY],
  ['EXTENSIBLE', TokenType.EXTENSIBLE],
]);

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch);
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  function location() {
    return { line, column, offset: pos };
  }

  function advance(): string {
    const ch = source[pos]!;
    pos++;
    if (ch === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return ch;
  }

  function peek(): string {
    return source[pos] ?? '\0';
  }

  function peekAt(offset: number): string {
    return source[pos + offset] ?? '\0';
  }

  function skipWhitespace() {
    while (pos < source.length) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        advance();
      } else if (ch === '(' && peekAt(1) === '*') {
        skipBlockComment();
      } else if (ch === '-' && peekAt(1) === '-') {
        skipLineComment();
      } else {
        break;
      }
    }
  }

  function skipBlockComment() {
    advance(); // (
    advance(); // *
    let depth = 1;
    while (pos < source.length && depth > 0) {
      if (peek() === '(' && peekAt(1) === '*') {
        advance();
        advance();
        depth++;
      } else if (peek() === '*' && peekAt(1) === ')') {
        advance();
        advance();
        depth--;
      } else {
        advance();
      }
    }
  }

  function skipLineComment() {
    advance(); // -
    advance(); // -
    while (pos < source.length && peek() !== '\n') {
      advance();
    }
  }

  function readString(): string {
    const startLoc = location();
    advance(); // opening '
    let value = '';
    while (pos < source.length) {
      const ch = advance();
      if (ch === "'") {
        if (peek() === "'") {
          advance(); // escaped ''
          value += "'";
        } else {
          return value;
        }
      } else {
        value += ch;
      }
    }
    throw new ParseError('Unterminated string literal', startLoc);
  }

  function readNumber(): Token {
    const loc = location();
    let value = '';
    while (pos < source.length && isDigit(peek())) {
      value += advance();
    }
    if (peek() === '.' && isDigit(peekAt(1))) {
      value += advance(); // .
      while (pos < source.length && isDigit(peek())) {
        value += advance();
      }
      if (peek() === 'E' || peek() === 'e') {
        value += advance();
        if (peek() === '+' || peek() === '-') {
          value += advance();
        }
        while (pos < source.length && isDigit(peek())) {
          value += advance();
        }
      }
      return { type: TokenType.REAL_LITERAL, value, location: loc };
    }
    return { type: TokenType.INTEGER_LITERAL, value, location: loc };
  }

  function readIdentifier(): Token {
    const loc = location();
    let value = '';
    while (pos < source.length && isAlphaNum(peek())) {
      value += advance();
    }
    const upper = value.toUpperCase();
    const keyword = KEYWORDS.get(upper);
    if (keyword !== undefined) {
      return { type: keyword, value: upper, location: loc };
    }
    return { type: TokenType.IDENTIFIER, value, location: loc };
  }

  while (pos < source.length) {
    skipWhitespace();
    if (pos >= source.length) break;

    const loc = location();
    const ch = peek();

    if (isAlpha(ch)) {
      tokens.push(readIdentifier());
      continue;
    }

    if (isDigit(ch)) {
      tokens.push(readNumber());
      continue;
    }

    if (ch === "'") {
      const value = readString();
      tokens.push({ type: TokenType.STRING_LITERAL, value, location: loc });
      continue;
    }

    advance();
    switch (ch) {
      case ';':
        tokens.push({ type: TokenType.SEMICOLON, value: ';', location: loc });
        break;
      case ',':
        tokens.push({ type: TokenType.COMMA, value: ',', location: loc });
        break;
      case '.':
        tokens.push({ type: TokenType.DOT, value: '.', location: loc });
        break;
      case '(':
        tokens.push({ type: TokenType.LPAREN, value: '(', location: loc });
        break;
      case ')':
        tokens.push({ type: TokenType.RPAREN, value: ')', location: loc });
        break;
      case '[':
        tokens.push({ type: TokenType.LBRACKET, value: '[', location: loc });
        break;
      case ']':
        tokens.push({ type: TokenType.RBRACKET, value: ']', location: loc });
        break;
      case '+':
        tokens.push({ type: TokenType.PLUS, value: '+', location: loc });
        break;
      case '-':
        tokens.push({ type: TokenType.MINUS, value: '-', location: loc });
        break;
      case '/':
        tokens.push({ type: TokenType.SLASH, value: '/', location: loc });
        break;
      case '\\':
        tokens.push({
          type: TokenType.BACKSLASH,
          value: '\\',
          location: loc,
        });
        break;
      case '|':
        if (peek() === '|') {
          advance();
          tokens.push({
            type: TokenType.COMPLEXCONCAT,
            value: '||',
            location: loc,
          });
        } else {
          tokens.push({ type: TokenType.PIPE, value: '|', location: loc });
        }
        break;
      case '?':
        tokens.push({ type: TokenType.QUESTION, value: '?', location: loc });
        break;
      case '#':
        tokens.push({ type: TokenType.HASH, value: '#', location: loc });
        break;
      case '*':
        if (peek() === '*') {
          advance();
          tokens.push({
            type: TokenType.DOUBLESTAR,
            value: '**',
            location: loc,
          });
        } else {
          tokens.push({ type: TokenType.STAR, value: '*', location: loc });
        }
        break;
      case ':':
        if (peek() === '=') {
          advance();
          tokens.push({ type: TokenType.ASSIGN, value: ':=', location: loc });
        } else if (peek() === '<') {
          advance();
          if (peek() === '>') {
            advance();
            tokens.push({ type: TokenType.NE, value: ':<>', location: loc });
          } else {
            tokens.push({ type: TokenType.COLON, value: ':', location: loc });
            tokens.push({
              type: TokenType.LT,
              value: '<',
              location: { ...loc, column: loc.column + 1, offset: loc.offset + 1 },
            });
          }
        } else {
          tokens.push({ type: TokenType.COLON, value: ':', location: loc });
        }
        break;
      case '<':
        if (peek() === '=') {
          advance();
          tokens.push({ type: TokenType.LE, value: '<=', location: loc });
        } else if (peek() === '>') {
          advance();
          tokens.push({ type: TokenType.NE, value: '<>', location: loc });
        } else {
          tokens.push({ type: TokenType.LT, value: '<', location: loc });
        }
        break;
      case '>':
        if (peek() === '=') {
          advance();
          tokens.push({ type: TokenType.GE, value: '>=', location: loc });
        } else {
          tokens.push({ type: TokenType.GT, value: '>', location: loc });
        }
        break;
      case '=':
        tokens.push({ type: TokenType.EQ, value: '=', location: loc });
        break;
      case '{':
        tokens.push({ type: TokenType.LPAREN, value: '{', location: loc });
        break;
      case '}':
        tokens.push({ type: TokenType.RPAREN, value: '}', location: loc });
        break;
      default:
        throw new ParseError(`Unexpected character: '${ch}'`, loc);
    }
  }

  tokens.push({
    type: TokenType.EOF,
    value: '',
    location: location(),
  });

  return tokens;
}
