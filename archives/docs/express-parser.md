# @ifc-factory/express-parser

Layer 0 package. Parses EXPRESS schema (.exp) files into an Abstract Syntax Tree (AST).

## Installation

```bash
pnpm add @ifc-factory/express-parser
```

## Usage

```typescript
import { parseExpress } from '@ifc-factory/express-parser';
import { readFileSync } from 'node:fs';

const source = readFileSync('IFC4X3_ADD2.exp', 'utf-8');
const schema = parseExpress(source);

console.log(`Schema: ${schema.name}`);
console.log(`Declarations: ${schema.declarations.length}`);

for (const decl of schema.declarations) {
  if (decl.kind === 'entity') {
    console.log(`Entity: ${decl.name}`);
    console.log(`  Attributes: ${decl.attributes.length}`);
    console.log(`  Abstract: ${decl.abstract}`);
    if (decl.subtypeOf) {
      console.log(`  Extends: ${decl.subtypeOf}`);
    }
  }
}
```

## API

### `parseExpress(source: string): SchemaNode`

Parses an EXPRESS schema string and returns the AST.

### `tokenize(source: string): Token[]`

Low-level tokenizer. Returns an array of tokens for debugging or custom processing.

## AST Types

### SchemaNode

```typescript
interface SchemaNode {
  name: string;
  declarations: Declaration[];
}
```

### Declaration (union)

- `TypeDeclaration` — TYPE definitions (enums, selects, aliases, aggregations)
- `EntityDeclaration` — ENTITY definitions with attributes, inheritance, WHERE rules
- `FunctionDeclaration` — FUNCTION bodies (stored as raw strings)
- `RuleDeclaration` — RULE bodies (stored as raw strings)

### EntityDeclaration

```typescript
interface EntityDeclaration {
  kind: 'entity';
  name: string;
  abstract: boolean;
  supertypeConstraint?: SupertypeConstraint;
  subtypeOf?: string;
  attributes: ExplicitAttribute[];
  deriveAttributes: DeriveAttribute[];
  inverseAttributes: InverseAttribute[];
  whereRules: WhereRule[];
  uniqueRules: UniqueRule[];
}
```

### ExplicitAttribute

```typescript
interface ExplicitAttribute {
  name: string;
  optional: boolean;
  type: AttributeType;
}
```

## Features

- Case-insensitive keyword matching
- Nested `(* ... *)` comment support
- Line comments (`-- ...`)
- Full ENTITY parsing (ABSTRACT, SUPERTYPE OF, SUBTYPE OF, DERIVE, INVERSE, WHERE, UNIQUE)
- FUNCTION/RULE bodies captured as raw strings (not deeply parsed)
- Error reporting with source location (line, column)
