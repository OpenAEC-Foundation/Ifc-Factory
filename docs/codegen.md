# @ifc-factory/codegen

Layer 1 package. Generates TypeScript code from an EXPRESS AST. Used internally to generate the `@ifc-factory/schema` package.

## Installation

```bash
pnpm add @ifc-factory/codegen
```

## CLI Usage

```bash
# Generate TypeScript from an EXPRESS schema
npx tsx packages/codegen/src/cli.ts schemas/IFC4X3_ADD2.exp packages/schema/src/generated/
```

Or via pnpm workspace script:

```bash
pnpm build:schema
```

## What Gets Generated

From the IFC4X3 ADD2 EXPRESS schema:

| Output | Count | Description |
|--------|-------|-------------|
| Entity interfaces | 876 | One `.ts` file per IFC entity |
| Enumerations | 243 | String enums matching STEP values |
| Type aliases | 132 | Primitive type wrappers |
| Select types | 61 | Union types for EXPRESS SELECTs |
| Schema metadata | 1 | Runtime attribute info for STEP parsing |
| Entity registry | 1 | UPPERCASE to PascalCase name mapping |

## Generated Code Structure

```
generated/
├── entities/
│   ├── IfcWall.ts
│   ├── IfcDoor.ts
│   └── ... (876 files)
├── enums/
│   ├── IfcWallTypeEnum.ts
│   └── ... (243 files)
├── types/
│   ├── IfcLabel.ts
│   └── ... (132 files)
├── selects/
│   ├── IfcValue.ts
│   └── ... (61 files)
├── metadata/
│   ├── schema-metadata.ts
│   └── entity-registry.ts
└── index.ts
```

## Type Mapping

| EXPRESS | TypeScript |
|---------|-----------|
| `INTEGER` | `number` |
| `REAL` | `number` |
| `NUMBER` | `number` |
| `BOOLEAN` | `boolean` |
| `LOGICAL` | `boolean \| null` |
| `STRING` | `string` |
| `BINARY` | `Uint8Array` |
| `SET OF T` | `T[]` |
| `LIST OF T` | `T[]` |
| `BAG OF T` | `T[]` |
| `ARRAY OF T` | `T[]` |
| `OPTIONAL T` | `T \| null` |
| `ENUMERATION` | `enum` (string values) |
| `SELECT` | union type |

## Programmatic API

```typescript
import { generateFromSchema } from '@ifc-factory/codegen';
import { parseExpress } from '@ifc-factory/express-parser';

const schema = parseExpress(expressSource);
await generateFromSchema(schema, './output/');
```
