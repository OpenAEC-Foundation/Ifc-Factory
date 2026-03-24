import { StepParseError } from './errors.js';

export enum StepTokenType {
  HEADER_TAG = 'HEADER_TAG',
  DATA_TAG = 'DATA_TAG',
  ENDSEC = 'ENDSEC',
  END_ISO = 'END_ISO',
  ISO_TAG = 'ISO_TAG',
  ENTITY_REF = 'ENTITY_REF',
  TYPE_NAME = 'TYPE_NAME',
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  REAL = 'REAL',
  ENUM = 'ENUM',
  DOLLAR = 'DOLLAR',
  STAR = 'STAR',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  EQ = 'EQ',
  EOF = 'EOF',
}

export interface StepToken {
  type: StepTokenType;
  value: string;
  line: number;
  column: number;
}

export function* tokenizeStep(source: string): Generator<StepToken> {
  let pos = 0;
  let line = 1;
  let column = 1;

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

  function skipWhitespace() {
    while (pos < source.length) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        advance();
      } else if (ch === '/' && source[pos + 1] === '*') {
        // C-style comment
        advance();
        advance();
        while (pos < source.length) {
          if (peek() === '*' && source[pos + 1] === '/') {
            advance();
            advance();
            break;
          }
          advance();
        }
      } else {
        break;
      }
    }
  }

  while (pos < source.length) {
    skipWhitespace();
    if (pos >= source.length) break;

    const startLine = line;
    const startCol = column;
    const ch = peek();

    // ISO tag: ISO-10303-21;
    if (ch === 'I' && source.slice(pos, pos + 13) === 'ISO-10303-21;') {
      for (let i = 0; i < 13; i++) advance();
      yield {
        type: StepTokenType.ISO_TAG,
        value: 'ISO-10303-21',
        line: startLine,
        column: startCol,
      };
      continue;
    }

    // END-ISO tag: END-ISO-10303-21;
    if (
      ch === 'E' &&
      source.slice(pos, pos + 16) === 'END-ISO-10303-21'
    ) {
      for (let i = 0; i < 16; i++) advance();
      // consume semicolon
      skipWhitespace();
      if (peek() === ';') advance();
      yield {
        type: StepTokenType.END_ISO,
        value: 'END-ISO-10303-21',
        line: startLine,
        column: startCol,
      };
      continue;
    }

    // Entity reference #123
    if (ch === '#') {
      advance();
      let num = '';
      while (pos < source.length && peek() >= '0' && peek() <= '9') {
        num += advance();
      }
      yield {
        type: StepTokenType.ENTITY_REF,
        value: num,
        line: startLine,
        column: startCol,
      };
      continue;
    }

    // String 'text'
    if (ch === "'") {
      advance();
      let value = '';
      while (pos < source.length) {
        const c = advance();
        if (c === "'") {
          if (peek() === "'") {
            advance();
            value += "''";
          } else {
            break;
          }
        } else {
          value += c;
        }
      }
      yield {
        type: StepTokenType.STRING,
        value,
        line: startLine,
        column: startCol,
      };
      continue;
    }

    // Enum .VALUE.
    if (ch === '.') {
      advance();
      if (peek() === 'T' && source[pos + 1] === '.') {
        advance();
        advance();
        yield {
          type: StepTokenType.ENUM,
          value: '.T.',
          line: startLine,
          column: startCol,
        };
        continue;
      }
      if (peek() === 'F' && source[pos + 1] === '.') {
        advance();
        advance();
        yield {
          type: StepTokenType.ENUM,
          value: '.F.',
          line: startLine,
          column: startCol,
        };
        continue;
      }
      if (peek() === 'U' && source.slice(pos, pos + 2) === 'U.') {
        advance();
        advance();
        yield {
          type: StepTokenType.ENUM,
          value: '.U.',
          line: startLine,
          column: startCol,
        };
        continue;
      }
      let enumVal = '.';
      while (pos < source.length && peek() !== '.') {
        enumVal += advance();
      }
      if (peek() === '.') {
        enumVal += advance();
      }
      yield {
        type: StepTokenType.ENUM,
        value: enumVal,
        line: startLine,
        column: startCol,
      };
      continue;
    }

    // Numbers (integer or real)
    if (
      (ch >= '0' && ch <= '9') ||
      (ch === '-' && source[pos + 1] !== undefined && source[pos + 1]! >= '0' && source[pos + 1]! <= '9') ||
      (ch === '+' && source[pos + 1] !== undefined && source[pos + 1]! >= '0' && source[pos + 1]! <= '9')
    ) {
      let num = '';
      if (ch === '-' || ch === '+') num += advance();
      while (pos < source.length && peek() >= '0' && peek() <= '9') {
        num += advance();
      }
      if (peek() === '.') {
        num += advance();
        while (pos < source.length && peek() >= '0' && peek() <= '9') {
          num += advance();
        }
        if (peek() === 'E' || peek() === 'e') {
          num += advance();
          if (peek() === '+' || peek() === '-') num += advance();
          while (pos < source.length && peek() >= '0' && peek() <= '9') {
            num += advance();
          }
        }
        yield {
          type: StepTokenType.REAL,
          value: num,
          line: startLine,
          column: startCol,
        };
      } else {
        yield {
          type: StepTokenType.INTEGER,
          value: num,
          line: startLine,
          column: startCol,
        };
      }
      continue;
    }

    // Identifiers / keywords
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      ch === '_'
    ) {
      let word = '';
      while (
        pos < source.length &&
        ((peek() >= 'A' && peek() <= 'Z') ||
          (peek() >= 'a' && peek() <= 'z') ||
          (peek() >= '0' && peek() <= '9') ||
          peek() === '_')
      ) {
        word += advance();
      }
      const upper = word.toUpperCase();
      if (upper === 'HEADER') {
        // expect ;
        skipWhitespace();
        if (peek() === ';') advance();
        yield {
          type: StepTokenType.HEADER_TAG,
          value: 'HEADER',
          line: startLine,
          column: startCol,
        };
      } else if (upper === 'DATA') {
        skipWhitespace();
        if (peek() === ';') advance();
        yield {
          type: StepTokenType.DATA_TAG,
          value: 'DATA',
          line: startLine,
          column: startCol,
        };
      } else if (upper === 'ENDSEC') {
        skipWhitespace();
        if (peek() === ';') advance();
        yield {
          type: StepTokenType.ENDSEC,
          value: 'ENDSEC',
          line: startLine,
          column: startCol,
        };
      } else {
        yield {
          type: StepTokenType.TYPE_NAME,
          value: upper,
          line: startLine,
          column: startCol,
        };
      }
      continue;
    }

    // Single-char tokens
    advance();
    switch (ch) {
      case '(':
        yield {
          type: StepTokenType.LPAREN,
          value: '(',
          line: startLine,
          column: startCol,
        };
        break;
      case ')':
        yield {
          type: StepTokenType.RPAREN,
          value: ')',
          line: startLine,
          column: startCol,
        };
        break;
      case ',':
        yield {
          type: StepTokenType.COMMA,
          value: ',',
          line: startLine,
          column: startCol,
        };
        break;
      case ';':
        yield {
          type: StepTokenType.SEMICOLON,
          value: ';',
          line: startLine,
          column: startCol,
        };
        break;
      case '=':
        yield {
          type: StepTokenType.EQ,
          value: '=',
          line: startLine,
          column: startCol,
        };
        break;
      case '$':
        yield {
          type: StepTokenType.DOLLAR,
          value: '$',
          line: startLine,
          column: startCol,
        };
        break;
      case '*':
        yield {
          type: StepTokenType.STAR,
          value: '*',
          line: startLine,
          column: startCol,
        };
        break;
      default:
        throw new StepParseError(
          `Unexpected character: '${ch}'`,
          startLine,
          startCol,
        );
    }
  }

  yield {
    type: StepTokenType.EOF,
    value: '',
    line,
    column,
  };
}
