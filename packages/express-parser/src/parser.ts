import { ParseError } from './errors.js';
import { tokenize } from './lexer.js';
import {
  type AggregationType,
  type ConstantDeclaration,
  type Declaration,
  type DeriveAttribute,
  type EntityDeclaration,
  type EnumerationType,
  type ExplicitAttribute,
  type FormalParameter,
  type FunctionDeclaration,
  type InverseAttribute,
  type InverseType,
  type NamedTypeRef,
  type ProcedureDeclaration,
  type RuleDeclaration,
  type SchemaNode,
  type SelectType,
  type SimpleType,
  type SupertypeConstraint,
  type Token,
  TokenType,
  type TypeDeclaration,
  type UnderlyingType,
  type UniqueRule,
  type WhereRule,
} from './types.js';

export function parse(source: string): SchemaNode {
  const tokens = tokenize(source);
  let pos = 0;

  function current(): Token {
    return tokens[pos]!;
  }

  function peek(): TokenType {
    return current().type;
  }

  function peekAhead(offset: number): TokenType {
    const idx = pos + offset;
    return idx < tokens.length ? tokens[idx]!.type : TokenType.EOF;
  }

  function advance(): Token {
    const tok = current();
    pos++;
    return tok;
  }

  function expect(type: TokenType): Token {
    const tok = current();
    if (tok.type !== type) {
      throw new ParseError(
        `Expected ${type}, got ${tok.type} ('${tok.value}')`,
        tok.location,
      );
    }
    return advance();
  }

  function match(type: TokenType): boolean {
    if (peek() === type) {
      advance();
      return true;
    }
    return false;
  }

  function parseSchema(): SchemaNode {
    expect(TokenType.SCHEMA);
    const name = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.SEMICOLON);

    // Skip optional REFERENCE FROM / USE FROM declarations
    while (
      peek() === TokenType.REFERENCE ||
      (peek() === TokenType.IDENTIFIER &&
        current().value.toUpperCase() === 'USE')
    ) {
      skipToSemicolon();
    }

    const declarations: Declaration[] = [];
    while (peek() !== TokenType.END_SCHEMA && peek() !== TokenType.EOF) {
      const decl = parseDeclaration();
      if (decl) {
        declarations.push(decl);
      }
    }

    expect(TokenType.END_SCHEMA);
    match(TokenType.SEMICOLON);

    return { kind: 'schema', name, declarations };
  }

  function skipToSemicolon() {
    while (peek() !== TokenType.SEMICOLON && peek() !== TokenType.EOF) {
      advance();
    }
    match(TokenType.SEMICOLON);
  }

  function parseDeclaration(): Declaration | null {
    switch (peek()) {
      case TokenType.TYPE:
        return parseTypeDeclaration();
      case TokenType.ENTITY:
        return parseEntityDeclaration(false);
      case TokenType.ABSTRACT:
        return parseAbstractDeclaration();
      case TokenType.FUNCTION:
        return parseFunctionDeclaration();
      case TokenType.PROCEDURE:
        return parseProcedureDeclaration();
      case TokenType.RULE:
        return parseRuleDeclaration();
      case TokenType.CONSTANT:
        return parseConstantBlock();
      case TokenType.SUBTYPE:
        // SUBTYPE_CONSTRAINT - skip
        return skipSubtypeConstraint();
      default:
        if (
          peek() === TokenType.IDENTIFIER &&
          current().value.toUpperCase() === 'SUBTYPE_CONSTRAINT'
        ) {
          return skipSubtypeConstraint();
        }
        // Skip unexpected tokens
        advance();
        return null;
    }
  }

  function skipSubtypeConstraint(): null {
    // Skip SUBTYPE_CONSTRAINT ... END_SUBTYPE_CONSTRAINT;
    let depth = 0;
    while (peek() !== TokenType.EOF) {
      const tok = advance();
      if (tok.value.toUpperCase() === 'SUBTYPE_CONSTRAINT') depth++;
      if (
        tok.value.toUpperCase() === 'END_SUBTYPE_CONSTRAINT' ||
        (tok.type === TokenType.IDENTIFIER &&
          tok.value.toUpperCase() === 'END_SUBTYPE_CONSTRAINT')
      ) {
        depth--;
        if (depth <= 0) {
          match(TokenType.SEMICOLON);
          return null;
        }
      }
    }
    return null;
  }

  // ─── TYPE ────────────────────────────────────────────────────

  function parseTypeDeclaration(): TypeDeclaration {
    expect(TokenType.TYPE);
    const name = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.EQ);

    const underlyingType = parseUnderlyingType();
    expect(TokenType.SEMICOLON);

    const whereRules: WhereRule[] = [];
    if (peek() === TokenType.WHERE) {
      advance();
      while (
        peek() !== TokenType.END_TYPE &&
        peek() !== TokenType.EOF
      ) {
        whereRules.push(parseWhereRule());
      }
    }

    expect(TokenType.END_TYPE);
    expect(TokenType.SEMICOLON);

    return { kind: 'type', name, underlyingType, whereRules };
  }

  function parseUnderlyingType(): UnderlyingType {
    if (peek() === TokenType.ENUMERATION || (peek() === TokenType.EXTENSIBLE && isFollowedByEnum())) {
      return parseEnumeration();
    }
    if (peek() === TokenType.SELECT || (peek() === TokenType.EXTENSIBLE && isFollowedBySelect())) {
      return parseSelect();
    }
    if (isAggregationType(peek())) {
      return parseAggregation();
    }
    return parseBaseType();
  }

  function isFollowedByEnum(): boolean {
    // Look ahead past EXTENSIBLE [GENERIC_ENTITY] to see ENUMERATION
    let lookAhead = 1;
    if (peekAhead(lookAhead) === TokenType.GENERIC_ENTITY) lookAhead++;
    return peekAhead(lookAhead) === TokenType.ENUMERATION;
  }

  function isFollowedBySelect(): boolean {
    let lookAhead = 1;
    if (peekAhead(lookAhead) === TokenType.GENERIC_ENTITY) lookAhead++;
    return peekAhead(lookAhead) === TokenType.SELECT;
  }

  function parseEnumeration(): EnumerationType {
    let extensible = false;
    if (peek() === TokenType.EXTENSIBLE) {
      advance();
      extensible = true;
      if (peek() === TokenType.GENERIC_ENTITY) advance();
    }
    expect(TokenType.ENUMERATION);

    let basedOn: string | undefined;
    const items: string[] = [];

    if (match(TokenType.BASED_ON)) {
      basedOn = expect(TokenType.IDENTIFIER).value;
      if (match(TokenType.WITH)) {
        expect(TokenType.LPAREN);
        items.push(...parseIdentifierList());
        expect(TokenType.RPAREN);
      }
    } else if (match(TokenType.OF)) {
      expect(TokenType.LPAREN);
      items.push(...parseIdentifierList());
      expect(TokenType.RPAREN);
    }

    return { kind: 'enumeration', extensible, items, basedOn };
  }

  function parseSelect(): SelectType {
    let extensible = false;
    if (peek() === TokenType.EXTENSIBLE) {
      advance();
      extensible = true;
      if (peek() === TokenType.GENERIC_ENTITY) advance();
    }
    expect(TokenType.SELECT);

    let basedOn: string | undefined;
    const items: string[] = [];

    if (match(TokenType.BASED_ON)) {
      basedOn = expect(TokenType.IDENTIFIER).value;
      if (match(TokenType.WITH)) {
        expect(TokenType.LPAREN);
        items.push(...parseIdentifierList());
        expect(TokenType.RPAREN);
      }
    } else if (match(TokenType.LPAREN)) {
      items.push(...parseIdentifierList());
      expect(TokenType.RPAREN);
    }

    return { kind: 'select', extensible, items, basedOn };
  }

  function parseIdentifierList(): string[] {
    const items: string[] = [];
    items.push(expect(TokenType.IDENTIFIER).value);
    while (match(TokenType.COMMA)) {
      items.push(expect(TokenType.IDENTIFIER).value);
    }
    return items;
  }

  function isAggregationType(type: TokenType): boolean {
    return (
      type === TokenType.SET ||
      type === TokenType.LIST ||
      type === TokenType.BAG ||
      type === TokenType.ARRAY
    );
  }

  function parseAggregation(): AggregationType {
    const aggregateType = advance().value as AggregationType['aggregateType'];

    let lowerBound: string | undefined;
    let upperBound: string | undefined;

    if (match(TokenType.LBRACKET)) {
      lowerBound = parseBoundExpression();
      expect(TokenType.COLON);
      upperBound = parseBoundExpression();
      expect(TokenType.RBRACKET);
    }

    let unique = false;
    if (peek() === TokenType.OF) {
      advance();
      if (match(TokenType.UNIQUE)) {
        unique = true;
      }
    }

    const elementType = parseUnderlyingType();

    return {
      kind: 'aggregation',
      aggregateType,
      lowerBound,
      upperBound,
      unique,
      elementType,
    };
  }

  function parseBoundExpression(): string {
    let expr = '';
    // Simple expression: could be a number, identifier, or ?
    if (peek() === TokenType.QUESTION) {
      advance();
      return '?';
    }
    // Collect tokens until : or ]
    while (
      peek() !== TokenType.COLON &&
      peek() !== TokenType.RBRACKET &&
      peek() !== TokenType.EOF
    ) {
      expr += advance().value;
    }
    return expr;
  }

  function parseBaseType(): UnderlyingType {
    switch (peek()) {
      case TokenType.INTEGER:
        advance();
        return { kind: 'simple', type: 'INTEGER' };
      case TokenType.REAL:
        advance();
        return { kind: 'simple', type: 'REAL' };
      case TokenType.NUMBER:
        advance();
        return { kind: 'simple', type: 'NUMBER' };
      case TokenType.BOOLEAN:
        advance();
        return { kind: 'simple', type: 'BOOLEAN' };
      case TokenType.LOGICAL:
        advance();
        return { kind: 'simple', type: 'LOGICAL' };
      case TokenType.STRING: {
        advance();
        let width: string | undefined;
        let fixed = false;
        if (match(TokenType.LPAREN)) {
          width = advance().value;
          expect(TokenType.RPAREN);
          if (match(TokenType.FIXED)) {
            fixed = true;
          }
        }
        return { kind: 'simple', type: 'STRING', width, fixed };
      }
      case TokenType.BINARY: {
        advance();
        let width: string | undefined;
        let fixed = false;
        if (match(TokenType.LPAREN)) {
          width = advance().value;
          expect(TokenType.RPAREN);
          if (match(TokenType.FIXED)) {
            fixed = true;
          }
        }
        return { kind: 'simple', type: 'BINARY', width, fixed };
      }
      case TokenType.IDENTIFIER: {
        const name = advance().value;
        return { kind: 'named', name };
      }
      default: {
        // Fallback: treat as named type
        const tok = advance();
        return { kind: 'named', name: tok.value };
      }
    }
  }

  // ─── ENTITY ──────────────────────────────────────────────────

  function parseAbstractDeclaration(): EntityDeclaration {
    // ABSTRACT always precedes ENTITY in IFC schema
    expect(TokenType.ABSTRACT);
    return parseEntityDeclaration(true);
  }

  function parseEntityDeclaration(abstract: boolean): EntityDeclaration {
    expect(TokenType.ENTITY);
    const name = expect(TokenType.IDENTIFIER).value;

    let supertype: SupertypeConstraint | undefined;
    const subtypeOf: string[] = [];

    // Inside entity: check for ABSTRACT SUPERTYPE OF / SUPERTYPE OF
    if (!abstract && match(TokenType.ABSTRACT)) {
      abstract = true;
    }

    if (peek() === TokenType.SUPERTYPE) {
      advance();
      if (match(TokenType.OF)) {
        expect(TokenType.LPAREN);
        const expr = collectBalancedParens();
        expect(TokenType.RPAREN);
        supertype = { kind: 'supertype', expression: expr };
      }
    }

    // Parse SUBTYPE OF
    if (match(TokenType.SUBTYPE)) {
      expect(TokenType.OF);
      expect(TokenType.LPAREN);
      subtypeOf.push(...parseIdentifierList());
      expect(TokenType.RPAREN);
    }

    expect(TokenType.SEMICOLON);

    // Parse explicit attributes
    const attributes: ExplicitAttribute[] = [];
    const deriveAttributes: DeriveAttribute[] = [];
    const inverseAttributes: InverseAttribute[] = [];
    const uniqueRules: UniqueRule[] = [];
    const whereRules: WhereRule[] = [];

    // Explicit attributes
    while (
      peek() !== TokenType.DERIVE &&
      peek() !== TokenType.INVERSE &&
      peek() !== TokenType.UNIQUE &&
      peek() !== TokenType.WHERE &&
      peek() !== TokenType.END_ENTITY &&
      peek() !== TokenType.EOF
    ) {
      attributes.push(...parseExplicitAttributes());
    }

    // DERIVE section
    if (match(TokenType.DERIVE)) {
      while (
        peek() !== TokenType.INVERSE &&
        peek() !== TokenType.UNIQUE &&
        peek() !== TokenType.WHERE &&
        peek() !== TokenType.END_ENTITY &&
        peek() !== TokenType.EOF
      ) {
        deriveAttributes.push(parseDeriveAttribute());
      }
    }

    // INVERSE section
    if (match(TokenType.INVERSE)) {
      while (
        peek() !== TokenType.UNIQUE &&
        peek() !== TokenType.WHERE &&
        peek() !== TokenType.END_ENTITY &&
        peek() !== TokenType.EOF
      ) {
        inverseAttributes.push(parseInverseAttribute());
      }
    }

    // UNIQUE section
    if (match(TokenType.UNIQUE)) {
      while (
        peek() !== TokenType.WHERE &&
        peek() !== TokenType.END_ENTITY &&
        peek() !== TokenType.EOF
      ) {
        uniqueRules.push(parseUniqueRule());
      }
    }

    // WHERE section
    if (match(TokenType.WHERE)) {
      while (
        peek() !== TokenType.END_ENTITY &&
        peek() !== TokenType.EOF
      ) {
        whereRules.push(parseWhereRule());
      }
    }

    expect(TokenType.END_ENTITY);
    expect(TokenType.SEMICOLON);

    return {
      kind: 'entity',
      name,
      abstract,
      supertype,
      subtypeOf,
      attributes,
      deriveAttributes,
      inverseAttributes,
      uniqueRules,
      whereRules,
    };
  }

  function collectBalancedParens(): string {
    let depth = 0;
    let expr = '';
    while (peek() !== TokenType.EOF) {
      if (peek() === TokenType.LPAREN) {
        depth++;
        expr += advance().value;
      } else if (peek() === TokenType.RPAREN) {
        if (depth === 0) break;
        depth--;
        expr += advance().value;
      } else {
        expr += advance().value;
        if (expr.endsWith(' ') === false) expr += ' ';
      }
    }
    return expr.trim();
  }

  function parseExplicitAttributes(): ExplicitAttribute[] {
    // name [, name] : [OPTIONAL] type ;
    const names: string[] = [];

    // Check if this looks like SELF\Entity.attr -- it's a redeclaration, skip
    if (peek() === TokenType.SELF) {
      // This is a redeclared attribute, capture as derive-like
      skipToSemicolon();
      return [];
    }

    names.push(expect(TokenType.IDENTIFIER).value);
    while (match(TokenType.COMMA)) {
      names.push(expect(TokenType.IDENTIFIER).value);
    }

    expect(TokenType.COLON);
    const optional = match(TokenType.OPTIONAL);
    const type = parseUnderlyingType();
    expect(TokenType.SEMICOLON);

    return names.map((name) => ({
      kind: 'explicit' as const,
      name,
      optional,
      type,
    }));
  }

  function parseDeriveAttribute(): DeriveAttribute {
    let name: string;
    // Could be SELF\Entity.attr or just attr
    if (peek() === TokenType.SELF) {
      advance(); // SELF
      expect(TokenType.BACKSLASH);
      advance(); // Entity name
      expect(TokenType.DOT);
      name = expect(TokenType.IDENTIFIER).value;
    } else {
      name = expect(TokenType.IDENTIFIER).value;
    }

    expect(TokenType.COLON);
    const type = parseUnderlyingType();
    expect(TokenType.ASSIGN);

    // Collect expression until ;
    let expression = '';
    while (peek() !== TokenType.SEMICOLON && peek() !== TokenType.EOF) {
      expression += current().value + ' ';
      advance();
    }
    expect(TokenType.SEMICOLON);

    return {
      kind: 'derive',
      name,
      type,
      expression: expression.trim(),
    };
  }

  function parseInverseAttribute(): InverseAttribute {
    let name: string;
    if (peek() === TokenType.SELF) {
      advance();
      expect(TokenType.BACKSLASH);
      advance();
      expect(TokenType.DOT);
      name = expect(TokenType.IDENTIFIER).value;
    } else {
      name = expect(TokenType.IDENTIFIER).value;
    }

    expect(TokenType.COLON);

    const type = parseInverseType();
    expect(TokenType.FOR);
    // forEntity might be qualified: Entity.attribute or just attribute
    let forEntity = '';
    let forAttribute = '';

    // Read tokens until ;
    const parts: string[] = [];
    while (peek() !== TokenType.SEMICOLON && peek() !== TokenType.EOF) {
      parts.push(advance().value);
    }
    expect(TokenType.SEMICOLON);

    // Parse "Entity.attr" from parts
    const combined = parts.join('');
    const dotIdx = combined.indexOf('.');
    if (dotIdx >= 0) {
      forEntity = combined.slice(0, dotIdx);
      forAttribute = combined.slice(dotIdx + 1);
    } else {
      forAttribute = combined;
    }

    return {
      kind: 'inverse',
      name,
      type,
      forEntity,
      forAttribute,
    };
  }

  function parseInverseType(): InverseType {
    let aggregateType: 'SET' | 'BAG' | undefined;
    let lowerBound: string | undefined;
    let upperBound: string | undefined;

    if (peek() === TokenType.SET || peek() === TokenType.BAG) {
      aggregateType = advance().value as 'SET' | 'BAG';
      if (match(TokenType.LBRACKET)) {
        lowerBound = parseBoundExpression();
        expect(TokenType.COLON);
        upperBound = parseBoundExpression();
        expect(TokenType.RBRACKET);
      }
      expect(TokenType.OF);
    }

    const entityRef = expect(TokenType.IDENTIFIER).value;

    return { aggregateType, lowerBound, upperBound, entityRef };
  }

  function parseUniqueRule(): UniqueRule {
    let name: string | undefined;
    // Could be "label : attr, attr;" or just "attr, attr;"
    const firstId = expect(TokenType.IDENTIFIER).value;
    if (match(TokenType.COLON)) {
      name = firstId;
      const attributes = [expect(TokenType.IDENTIFIER).value];
      while (match(TokenType.COMMA)) {
        // Could be SELF\Entity.attr
        if (peek() === TokenType.SELF) {
          let selfExpr = '';
          while (
            peek() !== TokenType.COMMA &&
            peek() !== TokenType.SEMICOLON &&
            peek() !== TokenType.EOF
          ) {
            selfExpr += advance().value;
          }
          attributes.push(selfExpr);
        } else {
          attributes.push(expect(TokenType.IDENTIFIER).value);
        }
      }
      expect(TokenType.SEMICOLON);
      return { name, attributes };
    }

    // No label
    const attributes = [firstId];
    while (match(TokenType.COMMA)) {
      attributes.push(expect(TokenType.IDENTIFIER).value);
    }
    expect(TokenType.SEMICOLON);
    return { attributes };
  }

  function parseWhereRule(): WhereRule {
    const name = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.COLON);

    let expression = '';
    let depth = 0;
    while (peek() !== TokenType.EOF) {
      if (peek() === TokenType.LPAREN) depth++;
      if (peek() === TokenType.RPAREN) depth--;
      if (peek() === TokenType.SEMICOLON && depth <= 0) {
        break;
      }
      expression += current().value + ' ';
      advance();
    }
    expect(TokenType.SEMICOLON);

    return { name, expression: expression.trim() };
  }

  // ─── FUNCTION / PROCEDURE / RULE ─────────────────────────────

  function parseFunctionDeclaration(): FunctionDeclaration {
    expect(TokenType.FUNCTION);
    const name = expect(TokenType.IDENTIFIER).value;

    const parameters = parseFormalParameters();
    expect(TokenType.COLON);

    // Return type - collect until ;
    let returnType = '';
    while (peek() !== TokenType.SEMICOLON && peek() !== TokenType.EOF) {
      returnType += current().value + ' ';
      advance();
    }
    expect(TokenType.SEMICOLON);

    // Body - collect until END_FUNCTION
    const body = collectUntilEnd(TokenType.END_FUNCTION);
    expect(TokenType.END_FUNCTION);
    expect(TokenType.SEMICOLON);

    return {
      kind: 'function',
      name,
      parameters,
      returnType: returnType.trim(),
      body,
    };
  }

  function parseProcedureDeclaration(): ProcedureDeclaration {
    expect(TokenType.PROCEDURE);
    const name = expect(TokenType.IDENTIFIER).value;

    const parameters = parseFormalParameters();
    expect(TokenType.SEMICOLON);

    const body = collectUntilEnd(TokenType.END_PROCEDURE);
    expect(TokenType.END_PROCEDURE);
    expect(TokenType.SEMICOLON);

    return {
      kind: 'procedure',
      name,
      parameters,
      body,
    };
  }

  function parseRuleDeclaration(): RuleDeclaration {
    expect(TokenType.RULE);
    const name = expect(TokenType.IDENTIFIER).value;
    expect(TokenType.FOR);
    expect(TokenType.LPAREN);
    const appliesTo = parseIdentifierList();
    expect(TokenType.RPAREN);
    expect(TokenType.SEMICOLON);

    // Body until WHERE or END_RULE
    let body = '';
    while (
      peek() !== TokenType.WHERE &&
      peek() !== TokenType.END_RULE &&
      peek() !== TokenType.EOF
    ) {
      body += current().value + ' ';
      advance();
    }

    const whereRules: WhereRule[] = [];
    if (match(TokenType.WHERE)) {
      while (
        peek() !== TokenType.END_RULE &&
        peek() !== TokenType.EOF
      ) {
        whereRules.push(parseWhereRule());
      }
    }

    expect(TokenType.END_RULE);
    expect(TokenType.SEMICOLON);

    return {
      kind: 'rule',
      name,
      appliesTo,
      body: body.trim(),
      whereRules,
    };
  }

  function parseConstantBlock(): ConstantDeclaration | null {
    expect(TokenType.CONSTANT);

    // For simplicity, collect constants and return the first one
    // In practice IFC schemas have very few constants
    const constants: ConstantDeclaration[] = [];

    while (
      peek() !== TokenType.END_CONSTANT &&
      peek() !== TokenType.EOF
    ) {
      const name = expect(TokenType.IDENTIFIER).value;
      expect(TokenType.COLON);

      let type = '';
      while (
        peek() !== TokenType.ASSIGN &&
        peek() !== TokenType.EOF
      ) {
        type += current().value + ' ';
        advance();
      }
      expect(TokenType.ASSIGN);

      let value = '';
      while (
        peek() !== TokenType.SEMICOLON &&
        peek() !== TokenType.EOF
      ) {
        value += current().value + ' ';
        advance();
      }
      expect(TokenType.SEMICOLON);

      constants.push({
        kind: 'constant',
        name,
        type: type.trim(),
        value: value.trim(),
      });
    }

    expect(TokenType.END_CONSTANT);
    expect(TokenType.SEMICOLON);

    return constants[0] ?? null;
  }

  function parseFormalParameters(): FormalParameter[] {
    const params: FormalParameter[] = [];
    if (peek() !== TokenType.LPAREN) return params;

    expect(TokenType.LPAREN);
    while (peek() !== TokenType.RPAREN && peek() !== TokenType.EOF) {
      const isVar = match(TokenType.VAR);
      const names: string[] = [];
      names.push(expect(TokenType.IDENTIFIER).value);
      while (match(TokenType.COMMA)) {
        names.push(expect(TokenType.IDENTIFIER).value);
      }
      expect(TokenType.COLON);

      let type = '';
      let depth = 0;
      while (peek() !== TokenType.EOF) {
        if (peek() === TokenType.LPAREN) depth++;
        if (peek() === TokenType.RPAREN) {
          if (depth === 0) break;
          depth--;
        }
        if (peek() === TokenType.SEMICOLON && depth === 0) break;
        type += current().value + ' ';
        advance();
      }
      match(TokenType.SEMICOLON);

      for (const name of names) {
        params.push({ name, type: type.trim(), var: isVar || undefined });
      }
    }
    expect(TokenType.RPAREN);
    return params;
  }

  function collectUntilEnd(endToken: TokenType): string {
    let body = '';
    let depth = 0;

    // Track nested constructs
    const openers = new Set([
      TokenType.FUNCTION,
      TokenType.PROCEDURE,
      TokenType.RULE,
      TokenType.IF,
      TokenType.REPEAT,
      TokenType.CASE,
      TokenType.BEGIN,
      TokenType.LOCAL,
      TokenType.ALIAS,
    ]);

    const closers = new Set([
      TokenType.END_FUNCTION,
      TokenType.END_PROCEDURE,
      TokenType.END_RULE,
      TokenType.END_IF,
      TokenType.END_REPEAT,
      TokenType.END_CASE,
      TokenType.END,
      TokenType.END_LOCAL,
      TokenType.END_ALIAS,
    ]);

    while (peek() !== TokenType.EOF) {
      if (peek() === endToken && depth === 0) break;

      if (openers.has(peek())) depth++;
      if (closers.has(peek())) depth--;

      body += current().value + ' ';
      advance();
    }

    return body.trim();
  }

  return parseSchema();
}
