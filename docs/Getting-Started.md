# Getting Started

## Installation

```bash
pnpm add @ifc-factory/core @ifc-factory/schema
```

Or with npm/yarn:

```bash
npm install @ifc-factory/core @ifc-factory/schema
yarn add @ifc-factory/core @ifc-factory/schema
```

## Requirements

- Node.js >= 20
- ESM or CJS module system

## Quick Examples

### Parse an IFC File

```typescript
import { IfcModel } from '@ifc-factory/core';
import { readFileSync } from 'node:fs';

const source = readFileSync('model.ifc', 'utf-8');
const model = IfcModel.fromStep(source);

console.log(`Schema: ${model.schema}`);
console.log(`Entities: ${model.size}`);
console.log(`Project: ${model.project?.Name}`);
```

### Query Entities

```typescript
import { QueryBuilder } from '@ifc-factory/core';

// Get all walls
const walls = model.getAllOfType('IfcWall');
console.log(`Found ${walls.length} walls`);

// Fluent query with filters
const query = new QueryBuilder(model)
  .ofType('IfcWall')
  .whereProperty('Name', 'Exterior Wall')
  .execute();
```

### Create a New Model

```typescript
import { IfcModel, createSpatialStructure, createPropertySet, assignPropertySet } from '@ifc-factory/core';

const model = new IfcModel();

// Build spatial hierarchy
const project = createSpatialStructure(model, {
  projectName: 'My Project',
  siteName: 'My Site',
  buildingName: 'Building A',
  storeyNames: ['Ground Floor', 'First Floor'],
});

// Create property set
const pset = createPropertySet(model, 'Pset_WallCommon', [
  { name: 'IsExternal', value: true },
  { name: 'ThermalTransmittance', value: 0.25, type: 'IFCREAL' },
]);

// Export to STEP
const stepOutput = model.toStep();
```

### Traverse Spatial Structure

```typescript
const tree = model.getSpatialTree();

function printTree(node, indent = 0) {
  console.log(' '.repeat(indent) + `${node.entity.type}: ${node.entity.Name}`);
  for (const child of node.children) {
    printTree(child, indent + 2);
  }
}

printTree(tree);
```

### Detect Schema Version

```typescript
import { detectSchemaVersion, isIfc4x3 } from '@ifc-factory/ifc-utils';
import { readFileSync } from 'node:fs';

const source = readFileSync('model.ifc', 'utf-8');
const version = detectSchemaVersion(source); // 'IFC4X3' | 'IFC4' | 'IFC2X3' | ...

if (isIfc4x3(source)) {
  console.log('This is an IFC4x3 file');
}
```

## Next Steps

- Read the [[Architecture]] page to understand how the library works
- See [[API Reference]] for the complete IfcModel API
- Check [[Dutch Compliance]] for BBL/BENG/Aerius support
