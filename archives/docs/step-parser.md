# @ifc-factory/step-parser

Layer 2 package. Schema-aware STEP parser that combines raw STEP parsing with IFC type resolution.

## Installation

```bash
pnpm add @ifc-factory/step-parser
```

## Usage

```typescript
import { parseStepToEntities } from '@ifc-factory/step-parser';
import { readFileSync } from 'node:fs';

const source = readFileSync('model.ifc', 'utf-8');
const result = parseStepToEntities(source);

console.log(`Schema: ${result.schema}`);
console.log(`Entities: ${result.entities.size}`);

for (const [id, entity] of result.entities) {
  console.log(`#${id}: ${entity.type} — ${entity.Name ?? '(unnamed)'}`);
}
```

## How It Works

The step-parser implements a two-pass approach:

### Pass 1: Raw STEP Parsing

Uses `@ifc-factory/step-serializer` to parse the physical file format:
- Tokenize the STEP file into tokens
- Parse HEADER section (FILE_DESCRIPTION, FILE_NAME, FILE_SCHEMA)
- Parse DATA section into `StepEntityInstance` records (type name + raw attribute array)

### Pass 2: Typed Entity Construction

Uses `@ifc-factory/schema` metadata to create typed entities:
- Look up each entity's type in `SCHEMA_METADATA`
- Map positional attributes to named properties using `allAttributes`
- Convert `StepEntityRef` values to integer expressIDs
- Convert `StepEnum` values to strings
- Handle `StepTypedValue` wrappers

## API

### `parseStepToEntities(source: string): ParseResult`

Full two-pass parse from STEP string to typed entities.

### `writeEntitiesToStep(entities: Map<number, IfcGenericEntity>, schema?: string): string`

Serialize typed entities back to a STEP file string.

## Types

### ParseResult

```typescript
interface ParseResult {
  schema: string;
  entities: Map<number, IfcGenericEntity>;
  header: StepHeader;
}
```
