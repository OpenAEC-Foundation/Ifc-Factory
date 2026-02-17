# @ifc-factory/step-serializer

Layer 0 package. Low-level STEP physical file (ISO 10303-21) tokenizer, reader, and writer. Schema-agnostic.

## Installation

```bash
pnpm add @ifc-factory/step-serializer
```

## Usage

### Reading a STEP File

```typescript
import { readStepFile } from '@ifc-factory/step-serializer';
import { readFileSync } from 'node:fs';

const source = readFileSync('model.ifc', 'utf-8');
const stepFile = readStepFile(source);

// Header info
console.log(`Schema: ${stepFile.header.fileSchema.schemas.join(', ')}`);
console.log(`File name: ${stepFile.header.fileName.name}`);

// Entities
console.log(`Entity count: ${stepFile.entities.size}`);

for (const [id, entity] of stepFile.entities) {
  console.log(`#${id} = ${entity.typeName}(${entity.attributes.length} attrs)`);
}
```

### Writing a STEP File

```typescript
import { writeStepFile } from '@ifc-factory/step-serializer';

const output = writeStepFile(stepFile);
writeFileSync('output.ifc', output);
```

### Round-Trip

```typescript
const source = readFileSync('model.ifc', 'utf-8');
const stepFile = readStepFile(source);
const output = writeStepFile(stepFile);
// output should produce an equivalent STEP file
```

## API

### `readStepFile(source: string): StepFile`

Parses a STEP physical file string into a structured object.

### `writeStepFile(stepFile: StepFile): string`

Serializes a StepFile object back to a STEP string.

## Types

### StepValue

The fundamental value type in STEP files:

```typescript
type StepValue =
  | number                    // integers and reals
  | string                    // 'single-quoted strings'
  | boolean                   // .T. / .F.
  | null                      // $ (omitted value)
  | StepDerived               // * (derived value)
  | StepEntityRef             // #123 (entity reference)
  | StepEnum                  // .ELEMENT. (enumeration)
  | StepTypedValue            // IFCLABEL('text') (typed value)
  | StepValue[]               // (1, 2, 3) (list)
```

### StepFile

```typescript
interface StepFile {
  header: StepHeader;
  entities: Map<number, StepEntityInstance>;
}
```

### StepEntityInstance

```typescript
interface StepEntityInstance {
  id: number;
  typeName: string;
  attributes: StepValue[];
}
```

## Unicode Support

Handles STEP unicode escape sequences:

- `\X\HH` — ISO 8859-1 single byte
- `\X2\HHHH\X0\` — UCS-2 (BMP)
- `\X4\HHHHHHHH\X0\` — UCS-4 (full Unicode)
- `\S\c` — ISO 8859 character with high bit set
