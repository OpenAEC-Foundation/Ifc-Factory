# @ifc-factory/schema

Layer 2 package. Auto-generated IFC4X3 ADD2 TypeScript types. Generated files are committed to the repository.

## Installation

```bash
pnpm add @ifc-factory/schema
```

## Usage

```typescript
import type { IfcWall, IfcDoor, IfcProject } from '@ifc-factory/schema';
import { SCHEMA_METADATA, ENTITY_REGISTRY } from '@ifc-factory/schema';

// Use types for type checking
const wall: IfcWall = {
  expressID: 1,
  type: 'IfcWall',
  GlobalId: '2TGt$H0E5Cexq0Fmv1x7tP',
  OwnerHistory: null,
  Name: 'External Wall',
  Description: null,
  ObjectType: null,
  ObjectPlacement: null,
  Representation: null,
  Tag: null,
  PredefinedType: null,
};

// Query metadata
const meta = SCHEMA_METADATA['IfcWall'];
console.log(`Parent: ${meta.parent}`);           // 'IfcBuildingElement'
console.log(`Abstract: ${meta.abstract}`);       // false
console.log(`Attributes: ${meta.allAttributes.length}`);

// Resolve uppercase STEP names to PascalCase
const name = ENTITY_REGISTRY['IFCWALL'];          // 'IfcWall'
```

## Schema Statistics

Generated from IFC4X3 ADD2 EXPRESS schema:

- **876** entity interfaces
- **243** enumerations
- **132** type aliases
- **61** select (union) types
- **~12,000** lines of schema metadata

## Key Types

### IfcGenericEntity

The base type for all IFC entities:

```typescript
interface IfcGenericEntity {
  expressID: number;
  type: string;
  [key: string]: unknown;
}
```

### SCHEMA_METADATA

Runtime metadata for each entity type:

```typescript
interface EntityMetadata {
  parent: string | null;
  abstract: boolean;
  allAttributes: AttributeMetadata[];
}

interface AttributeMetadata {
  name: string;
  type: string;
  optional: boolean;
}
```

The `allAttributes` array includes inherited attributes in STEP order, which is essential for correct STEP file parsing and serialization.

### ENTITY_REGISTRY

Maps uppercase STEP type names to PascalCase TypeScript names:

```typescript
const ENTITY_REGISTRY: Record<string, string> = {
  'IFCWALL': 'IfcWall',
  'IFCDOOR': 'IfcDoor',
  // ... 876 entries
};
```

## Regenerating the Schema

```bash
pnpm build:schema
```

This runs the codegen CLI against `schemas/IFC4X3_ADD2.exp` and writes output to `packages/schema/src/generated/`.
