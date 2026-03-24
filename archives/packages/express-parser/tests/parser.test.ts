import { describe, expect, it } from 'vitest';
import { parseExpress, tokenize } from '../src/index.js';

describe('lexer', () => {
  it('tokenizes keywords case-insensitively', () => {
    const tokens = tokenize('SCHEMA schema Schema');
    expect(tokens[0]!.type).toBe('SCHEMA');
    expect(tokens[1]!.type).toBe('SCHEMA');
    expect(tokens[2]!.type).toBe('SCHEMA');
  });

  it('tokenizes string literals with escaped quotes', () => {
    const tokens = tokenize("'hello''world'");
    expect(tokens[0]!.type).toBe('STRING_LITERAL');
    expect(tokens[0]!.value).toBe("hello'world");
  });

  it('skips block comments', () => {
    const tokens = tokenize('SCHEMA (* comment *) test;');
    expect(tokens[0]!.type).toBe('SCHEMA');
    expect(tokens[1]!.type).toBe('IDENTIFIER');
    expect(tokens[1]!.value).toBe('test');
  });

  it('skips nested block comments', () => {
    const tokens = tokenize('SCHEMA (* outer (* inner *) still *) test;');
    expect(tokens[0]!.type).toBe('SCHEMA');
    expect(tokens[1]!.type).toBe('IDENTIFIER');
  });

  it('skips line comments', () => {
    const tokens = tokenize('SCHEMA -- comment\ntest;');
    expect(tokens[0]!.type).toBe('SCHEMA');
    expect(tokens[1]!.type).toBe('IDENTIFIER');
  });

  it('tokenizes numbers', () => {
    const tokens = tokenize('42 3.14 1.0E10');
    expect(tokens[0]!.type).toBe('INTEGER_LITERAL');
    expect(tokens[1]!.type).toBe('REAL_LITERAL');
    expect(tokens[2]!.type).toBe('REAL_LITERAL');
  });

  it('tokenizes operators', () => {
    const tokens = tokenize(':= <> <= >=');
    expect(tokens[0]!.type).toBe('ASSIGN');
    expect(tokens[1]!.type).toBe('NE');
    expect(tokens[2]!.type).toBe('LE');
    expect(tokens[3]!.type).toBe('GE');
  });
});

describe('parser', () => {
  it('parses an empty schema', () => {
    const ast = parseExpress('SCHEMA IFC4X3; END_SCHEMA;');
    expect(ast.kind).toBe('schema');
    expect(ast.name).toBe('IFC4X3');
    expect(ast.declarations).toEqual([]);
  });

  it('parses a simple type', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        TYPE IfcLabel = STRING;
        END_TYPE;
      END_SCHEMA;
    `);
    expect(ast.declarations).toHaveLength(1);
    const decl = ast.declarations[0]!;
    expect(decl.kind).toBe('type');
    if (decl.kind === 'type') {
      expect(decl.name).toBe('IfcLabel');
      expect(decl.underlyingType.kind).toBe('simple');
      if (decl.underlyingType.kind === 'simple') {
        expect(decl.underlyingType.type).toBe('STRING');
      }
    }
  });

  it('parses an enumeration type', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        TYPE IfcActionSourceTypeEnum = ENUMERATION OF
          (DEAD_LOAD_G, LIVE_LOAD_Q, WIND_W);
        END_TYPE;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    expect(decl.kind).toBe('type');
    if (decl.kind === 'type') {
      expect(decl.underlyingType.kind).toBe('enumeration');
      if (decl.underlyingType.kind === 'enumeration') {
        expect(decl.underlyingType.items).toEqual([
          'DEAD_LOAD_G',
          'LIVE_LOAD_Q',
          'WIND_W',
        ]);
      }
    }
  });

  it('parses a select type', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        TYPE IfcValue = SELECT
          (IfcMeasureValue, IfcSimpleValue);
        END_TYPE;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    if (decl.kind === 'type') {
      expect(decl.underlyingType.kind).toBe('select');
      if (decl.underlyingType.kind === 'select') {
        expect(decl.underlyingType.items).toEqual([
          'IfcMeasureValue',
          'IfcSimpleValue',
        ]);
      }
    }
  });

  it('parses an aggregation type', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        TYPE IfcComplexNumber = ARRAY [1:2] OF REAL;
        END_TYPE;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    if (decl.kind === 'type') {
      expect(decl.underlyingType.kind).toBe('aggregation');
      if (decl.underlyingType.kind === 'aggregation') {
        expect(decl.underlyingType.aggregateType).toBe('ARRAY');
        expect(decl.underlyingType.lowerBound).toBe('1');
        expect(decl.underlyingType.upperBound).toBe('2');
      }
    }
  });

  it('parses a simple entity', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        ENTITY IfcRoot
          ABSTRACT SUPERTYPE OF (ONEOF(IfcObjectDefinition, IfcPropertyDefinition, IfcRelationship));
            GlobalId : IfcGloballyUniqueId;
            OwnerHistory : OPTIONAL IfcOwnerHistory;
            Name : OPTIONAL IfcLabel;
            Description : OPTIONAL IfcText;
        END_ENTITY;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    expect(decl.kind).toBe('entity');
    if (decl.kind === 'entity') {
      expect(decl.name).toBe('IfcRoot');
      expect(decl.abstract).toBe(true);
      expect(decl.attributes).toHaveLength(4);
      expect(decl.attributes[0]!.name).toBe('GlobalId');
      expect(decl.attributes[0]!.optional).toBe(false);
      expect(decl.attributes[1]!.optional).toBe(true);
    }
  });

  it('parses entity with subtype', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        ENTITY IfcWall
          SUBTYPE OF (IfcBuildingElement);
            PredefinedType : OPTIONAL IfcWallTypeEnum;
        END_ENTITY;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    if (decl.kind === 'entity') {
      expect(decl.name).toBe('IfcWall');
      expect(decl.subtypeOf).toEqual(['IfcBuildingElement']);
    }
  });

  it('parses entity with derive and inverse', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        ENTITY IfcObjectDefinition
          ABSTRACT SUPERTYPE OF (ONEOF(IfcObject))
          SUBTYPE OF (IfcRoot);
          INVERSE
            HasAssignments : SET [0:?] OF IfcRelAssigns FOR RelatedObjects;
        END_ENTITY;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    if (decl.kind === 'entity') {
      expect(decl.inverseAttributes).toHaveLength(1);
      expect(decl.inverseAttributes[0]!.name).toBe('HasAssignments');
    }
  });

  it('parses functions as raw body', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        FUNCTION IfcCorrectDimensions(m : IfcUnitEnum; Dim : IfcDimensionalExponents) : LOGICAL;
          CASE m OF
            LENGTHUNIT : RETURN(TRUE);
          END_CASE;
          RETURN(FALSE);
        END_FUNCTION;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    expect(decl.kind).toBe('function');
    if (decl.kind === 'function') {
      expect(decl.name).toBe('IfcCorrectDimensions');
      expect(decl.body).toContain('CASE');
    }
  });

  it('parses rules', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        RULE IfcSingleProjectInstance FOR (IfcProject);
          LOCAL
            Projects : SET OF IfcProject;
          END_LOCAL;
          Projects := IfcProject;
        WHERE
          WR1 : SIZEOF(Projects) = 1;
        END_RULE;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    expect(decl.kind).toBe('rule');
    if (decl.kind === 'rule') {
      expect(decl.name).toBe('IfcSingleProjectInstance');
      expect(decl.appliesTo).toEqual(['IfcProject']);
      expect(decl.whereRules).toHaveLength(1);
    }
  });

  it('parses entity with where rules', () => {
    const ast = parseExpress(`
      SCHEMA Test;
        ENTITY IfcDirection;
            DirectionRatios : LIST [2:3] OF REAL;
        WHERE
            MagnitudeGreaterZero : SIZEOF(DirectionRatios) >= 2;
        END_ENTITY;
      END_SCHEMA;
    `);
    const decl = ast.declarations[0]!;
    if (decl.kind === 'entity') {
      expect(decl.whereRules).toHaveLength(1);
      expect(decl.whereRules[0]!.name).toBe('MagnitudeGreaterZero');
    }
  });
});
