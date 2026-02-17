import { StepParseError } from './errors.js';
import { type StepToken, StepTokenType, tokenizeStep } from './tokenizer.js';
import {
  StepDerived,
  StepEntityRef,
  StepEnum,
  type StepEntityInstance,
  type StepFile,
  type StepHeader,
  type StepValue,
  StepTypedValue,
} from './types.js';
import { decodeStepString } from './unicode.js';

export function readStep(source: string): StepFile {
  const tokens: StepToken[] = [];
  for (const tok of tokenizeStep(source)) {
    tokens.push(tok);
  }

  let pos = 0;

  function current(): StepToken {
    return tokens[pos]!;
  }

  function peek(): StepTokenType {
    return current().type;
  }

  function advance(): StepToken {
    const tok = current();
    pos++;
    return tok;
  }

  function expect(type: StepTokenType): StepToken {
    const tok = current();
    if (tok.type !== type) {
      throw new StepParseError(
        `Expected ${type}, got ${tok.type} ('${tok.value}')`,
        tok.line,
        tok.column,
      );
    }
    return advance();
  }

  function match(type: StepTokenType): boolean {
    if (peek() === type) {
      advance();
      return true;
    }
    return false;
  }

  // ISO tag
  expect(StepTokenType.ISO_TAG);

  // HEADER
  expect(StepTokenType.HEADER_TAG);
  const header = parseHeader();
  expect(StepTokenType.ENDSEC);

  // DATA
  expect(StepTokenType.DATA_TAG);
  const entities = parseDataSection();
  expect(StepTokenType.ENDSEC);

  // END-ISO
  expect(StepTokenType.END_ISO);

  return { header, entities };

  function parseHeader(): StepHeader {
    const header: StepHeader = {
      description: [],
      implementationLevel: '',
      name: '',
      timeStamp: '',
      author: [],
      organization: [],
      preprocessorVersion: '',
      originatingSystem: '',
      authorization: '',
      schemas: [],
    };

    // FILE_DESCRIPTION
    if (peek() === StepTokenType.TYPE_NAME && current().value === 'FILE_DESCRIPTION') {
      advance();
      expect(StepTokenType.LPAREN);
      // description tuple
      if (peek() === StepTokenType.LPAREN) {
        advance();
        while (peek() !== StepTokenType.RPAREN && peek() !== StepTokenType.EOF) {
          if (peek() === StepTokenType.STRING) {
            header.description.push(decodeStepString(advance().value));
          } else {
            match(StepTokenType.COMMA);
          }
        }
        expect(StepTokenType.RPAREN);
      }
      match(StepTokenType.COMMA);
      if (peek() === StepTokenType.STRING) {
        header.implementationLevel = decodeStepString(advance().value);
      }
      expect(StepTokenType.RPAREN);
      expect(StepTokenType.SEMICOLON);
    }

    // FILE_NAME
    if (peek() === StepTokenType.TYPE_NAME && current().value === 'FILE_NAME') {
      advance();
      expect(StepTokenType.LPAREN);

      // name
      if (peek() === StepTokenType.STRING) {
        header.name = decodeStepString(advance().value);
      }
      match(StepTokenType.COMMA);

      // timestamp
      if (peek() === StepTokenType.STRING) {
        header.timeStamp = decodeStepString(advance().value);
      }
      match(StepTokenType.COMMA);

      // author
      if (peek() === StepTokenType.LPAREN) {
        advance();
        while (peek() !== StepTokenType.RPAREN && peek() !== StepTokenType.EOF) {
          if (peek() === StepTokenType.STRING) {
            header.author.push(decodeStepString(advance().value));
          } else {
            match(StepTokenType.COMMA);
          }
        }
        expect(StepTokenType.RPAREN);
      }
      match(StepTokenType.COMMA);

      // organization
      if (peek() === StepTokenType.LPAREN) {
        advance();
        while (peek() !== StepTokenType.RPAREN && peek() !== StepTokenType.EOF) {
          if (peek() === StepTokenType.STRING) {
            header.organization.push(decodeStepString(advance().value));
          } else {
            match(StepTokenType.COMMA);
          }
        }
        expect(StepTokenType.RPAREN);
      }
      match(StepTokenType.COMMA);

      // preprocessorVersion
      if (peek() === StepTokenType.STRING) {
        header.preprocessorVersion = decodeStepString(advance().value);
      }
      match(StepTokenType.COMMA);

      // originatingSystem
      if (peek() === StepTokenType.STRING) {
        header.originatingSystem = decodeStepString(advance().value);
      }
      match(StepTokenType.COMMA);

      // authorization
      if (peek() === StepTokenType.STRING) {
        header.authorization = decodeStepString(advance().value);
      }

      expect(StepTokenType.RPAREN);
      expect(StepTokenType.SEMICOLON);
    }

    // FILE_SCHEMA
    if (peek() === StepTokenType.TYPE_NAME && current().value === 'FILE_SCHEMA') {
      advance();
      expect(StepTokenType.LPAREN);
      if (peek() === StepTokenType.LPAREN) {
        advance();
        while (peek() !== StepTokenType.RPAREN && peek() !== StepTokenType.EOF) {
          if (peek() === StepTokenType.STRING) {
            header.schemas.push(decodeStepString(advance().value));
          } else {
            match(StepTokenType.COMMA);
          }
        }
        expect(StepTokenType.RPAREN);
      }
      expect(StepTokenType.RPAREN);
      expect(StepTokenType.SEMICOLON);
    }

    // Skip remaining header entries
    while (peek() !== StepTokenType.ENDSEC && peek() !== StepTokenType.EOF) {
      advance();
    }

    return header;
  }

  function parseDataSection(): Map<number, StepEntityInstance> {
    const entities = new Map<number, StepEntityInstance>();

    while (peek() === StepTokenType.ENTITY_REF) {
      const idTok = advance();
      const id = Number.parseInt(idTok.value, 10);
      expect(StepTokenType.EQ);

      const typeTok = expect(StepTokenType.TYPE_NAME);
      expect(StepTokenType.LPAREN);
      const attributes = parseAttributeList();
      expect(StepTokenType.RPAREN);
      expect(StepTokenType.SEMICOLON);

      entities.set(id, {
        id,
        typeName: typeTok.value,
        attributes,
      });
    }

    return entities;
  }

  function parseAttributeList(): StepValue[] {
    const values: StepValue[] = [];
    if (peek() === StepTokenType.RPAREN) return values;

    values.push(parseValue());
    while (match(StepTokenType.COMMA)) {
      values.push(parseValue());
    }
    return values;
  }

  function parseValue(): StepValue {
    switch (peek()) {
      case StepTokenType.INTEGER:
        return Number.parseInt(advance().value, 10);

      case StepTokenType.REAL:
        return Number.parseFloat(advance().value);

      case StepTokenType.STRING:
        return decodeStepString(advance().value);

      case StepTokenType.ENTITY_REF:
        return new StepEntityRef(Number.parseInt(advance().value, 10));

      case StepTokenType.ENUM: {
        const val = advance().value;
        if (val === '.T.') return true;
        if (val === '.F.') return false;
        if (val === '.U.') return null;
        // Strip dots
        return new StepEnum(val.slice(1, -1));
      }

      case StepTokenType.DOLLAR:
        advance();
        return null;

      case StepTokenType.STAR:
        advance();
        return StepDerived.instance;

      case StepTokenType.LPAREN: {
        advance();
        const list: StepValue[] = [];
        if (peek() !== StepTokenType.RPAREN) {
          list.push(parseValue());
          while (match(StepTokenType.COMMA)) {
            list.push(parseValue());
          }
        }
        expect(StepTokenType.RPAREN);
        return list;
      }

      case StepTokenType.TYPE_NAME: {
        // Typed value: IFCLABEL('text')
        const typeName = advance().value;
        expect(StepTokenType.LPAREN);
        const value = parseValue();
        expect(StepTokenType.RPAREN);
        return new StepTypedValue(typeName, value);
      }

      default: {
        const tok = current();
        throw new StepParseError(
          `Unexpected token: ${tok.type} ('${tok.value}')`,
          tok.line,
          tok.column,
        );
      }
    }
  }
}
