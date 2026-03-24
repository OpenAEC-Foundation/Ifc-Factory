# Ifc-Factory

Pure TypeScript IFC4x3 library for parsing, writing, and manipulating IFC (Industry Foundation Classes) data. A lightweight alternative to IfcOpenShell and web-ifc, focused on data operations.

## Features

- **Full IFC4X3 ADD2 schema** — auto-generated TypeScript types from official EXPRESS schema
- **STEP file I/O** — parse and write ISO 10303-21 (STEP Physical File) format
- **Schema-aware parsing** — typed entity construction with full attribute metadata
- **Spatial structure** — traverse and build project/site/building/storey hierarchies
- **Property sets** — create, assign, and query IfcPropertySet and IfcElementQuantity
- **Documents & libraries** — manage IfcDocumentInformation and IfcLibraryReference
- **Classifications** — associate IfcClassification references to elements
- **2D annotations** — create IfcAnnotation and text literals
- **Dutch compliance** — BBL (brandveiligheid), BENG (energieprestatie), Aerius (stikstof) property set templates
- **Fluent query API** — chainable query builder with composable filters
- **Zero dependencies** — pure TypeScript, no native modules, no WASM
- **Dual ESM/CJS** — works in Node.js >=20, bundlers, and modern runtimes

## Quick Start

```bash
pnpm add @ifc-factory/core @ifc-factory/schema
```

### Parse an IFC file

```typescript
import { IfcModel } from '@ifc-factory/core';
import { readFileSync } from 'node:fs';

const source = readFileSync('model.ifc', 'utf-8');
const model = IfcModel.fromStep(source);

console.log(`Schema: ${model.schema}`);
console.log(`Entities: ${model.size}`);
console.log(`Project: ${model.project?.Name}`);
```

### Query entities

```typescript
import { QueryBuilder, byType } from '@ifc-factory/core';

const walls = model.getAllOfType('IfcWall');
console.log(`Found ${walls.length} walls`);

// Fluent query
const query = new QueryBuilder(model)
  .ofType('IfcWall')
  .whereProperty('Name', 'Exterior Wall')
  .execute();
```

### Create a new model

```typescript
import { IfcModel, createSpatialStructure, createPropertySet, assignPropertySet } from '@ifc-factory/core';

const model = new IfcModel();

// Build spatial structure
const project = createSpatialStructure(model, {
  projectName: 'My Project',
  siteName: 'My Site',
  buildingName: 'Building A',
  storeyNames: ['Ground Floor', 'First Floor'],
});

// Create and assign property sets
const pset = createPropertySet(model, 'Pset_WallCommon', [
  { name: 'IsExternal', value: true },
  { name: 'ThermalTransmittance', value: 0.25, type: 'IFCREAL' },
]);

// Serialize to STEP
const stepOutput = model.toStep();
```

### Dutch compliance (BBL/BENG/Aerius)

```typescript
import { createBBLPropertySet, createBENGPropertySet, createAeriusPropertySet } from '@ifc-factory/core';

// Brandveiligheid (BBL)
createBBLPropertySet(model, [wallId], {
  brandklasse: 'A1',
  brandwerendheid: 60,
  wbdbo: 30,
});

// Energieprestatie (BENG)
createBENGPropertySet(model, [buildingId], {
  energieBehoefte: 25.0,
  primairFossieleEnergie: 50.0,
  aandeelHernieuwbareEnergie: 40.0,
});

// Stikstof (Aerius)
createAeriusPropertySet(model, [projectId], {
  stikstofEmissie: 1.5,
  projectId: 'AERIUS-2024-001',
});
```

## Packages

| Package | Description | Layer |
|---------|-------------|-------|
| `@ifc-factory/express-parser` | EXPRESS schema (.exp) parser | 0 |
| `@ifc-factory/step-serializer` | ISO 10303-21 STEP tokenizer/reader/writer | 0 |
| `@ifc-factory/codegen` | TypeScript code generator from EXPRESS AST | 1 |
| `@ifc-factory/schema` | Auto-generated IFC4X3 TypeScript types | 2 |
| `@ifc-factory/step-parser` | Schema-aware STEP parser | 2 |
| `@ifc-factory/core` | Main library: IfcModel, helpers, compliance | 3 |
| `@ifc-factory/ifc-utils` | Convenience utilities (validation, diff, batch) | 4 |

### Dependency Graph

```
express-parser ─────┐
                    v
step-serializer    codegen
       │              │
       │              v
       └──────► schema
                  │
                  v
              step-parser
                  │
                  v
                core
                  │
                  v
              ifc-utils
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
git clone https://github.com/3bm-nl/Ifc-Factory.git
cd Ifc-Factory
pnpm install
```

### Build

```bash
pnpm build              # Build all packages
pnpm build:schema       # Regenerate schema from EXPRESS
```

### Test

```bash
pnpm test               # Run all tests
pnpm test:watch         # Watch mode
```

### Lint

```bash
pnpm lint               # Check with Biome
pnpm lint:fix           # Auto-fix
```

### Regenerate Schema

To regenerate the TypeScript types from the IFC4X3 EXPRESS schema:

```bash
pnpm build:schema
```

This parses `schemas/IFC4X3_ADD2.exp` and generates TypeScript interfaces, enums, type aliases, and metadata into `packages/schema/src/generated/`.

## Schema Statistics

Generated from IFC4X3 ADD2 EXPRESS schema:

- **876** entity interfaces
- **243** enumerations
- **132** type aliases
- **61** select (union) types
- **12,000+** lines of schema metadata

## Architecture

### Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Entity storage | `Map<number, IfcGenericEntity>` + type index | O(1) lookup, fast type queries |
| Entity references | Stored as `number` (expressID) | No circular refs, easy serialization |
| Relationship indexes | Eager rebuild at load, incremental on mutation | Fast spatial traversal |
| Generated code | Interfaces, not classes | No circular import issues |
| Schema metadata | Runtime object with allAttributes per entity | STEP parser needs flat ordered attribute list |
| Type discriminant | `type: string` on root entities | Compatible inheritance hierarchy |

### Two-Pass Parsing

1. **Pass 1** (`step-serializer`): Raw STEP physical file → `StepEntityInstance` records
2. **Pass 2** (`step-parser`): Typed entity construction using schema metadata

## License

ISC

## Credits

- IFC4X3 ADD2 EXPRESS schema: [buildingSMART International](https://www.buildingsmart.org/) (CC BY-ND 4.0)
- Built with TypeScript, Vitest, tsup, Biome
