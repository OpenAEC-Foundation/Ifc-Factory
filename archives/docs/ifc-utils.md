# @ifc-factory/ifc-utils

Layer 4 package. Optional convenience utilities for model validation, diffing, batch operations, and schema detection.

## Installation

```bash
pnpm add @ifc-factory/ifc-utils
```

## Model Validation

```typescript
import { validateModel } from '@ifc-factory/ifc-utils';

const issues = validateModel(model);

for (const issue of issues) {
  console.log(`[${issue.severity}] ${issue.message}`);
  if (issue.entityId) {
    console.log(`  Entity: #${issue.entityId}`);
  }
}
```

### Validation Checks

- Presence of `IfcProject` entity
- Duplicate `GlobalId` values
- Orphaned relationship references
- Missing required attributes

### ValidationIssue

```typescript
interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  entityId?: number;
}
```

## Model Diffing

```typescript
import { diffModels } from '@ifc-factory/ifc-utils';

const diff = diffModels(modelA, modelB);

console.log(`Added: ${diff.added.length} entities`);
console.log(`Removed: ${diff.removed.length} entities`);
console.log(`Modified: ${diff.modified.length} entities`);

for (const mod of diff.modified) {
  console.log(`Entity #${mod.id}:`);
  for (const change of mod.changes) {
    console.log(`  ${change}`);
  }
}
```

### ModelDiff

```typescript
interface ModelDiff {
  added: number[];        // expressIDs only in modelB
  removed: number[];      // expressIDs only in modelA
  modified: {
    id: number;
    changes: string[];    // human-readable change descriptions
  }[];
}
```

## Schema Version Detection

```typescript
import { detectSchemaVersion, isIfc4x3 } from '@ifc-factory/ifc-utils';

const source = readFileSync('model.ifc', 'utf-8');

const version = detectSchemaVersion(source);
// Returns: 'IFC4X3' | 'IFC4' | 'IFC4X1' | 'IFC4X2' | 'IFC2X3' | 'UNKNOWN'

if (isIfc4x3(source)) {
  // Parse with IFC4x3 schema
}
```

## GUID Utilities

```typescript
import { generateIfcGuid, generateMultipleGuids, validateGuid, isValidIfcGuid } from '@ifc-factory/ifc-utils';

// Generate a single GUID
const guid = generateIfcGuid();

// Generate multiple GUIDs
const guids = generateMultipleGuids(10);

// Validate
const valid = isValidIfcGuid('2TGt$H0E5Cexq0Fmv1x7tP'); // true
const issues = validateGuid('invalid');                     // returns issues array
```

## Batch Operations

### Batch Assign Properties

```typescript
import { batchAssignProperties } from '@ifc-factory/ifc-utils';

batchAssignProperties(model, [
  {
    elementIds: [wall1Id, wall2Id, wall3Id],
    psetName: 'Pset_WallCommon',
    properties: [
      { name: 'IsExternal', value: true },
      { name: 'ThermalTransmittance', value: 0.25, type: 'IFCREAL' },
    ],
  },
  {
    elementIds: [door1Id, door2Id],
    psetName: 'Pset_DoorCommon',
    properties: [
      { name: 'IsExternal', value: false },
    ],
  },
]);
```

### Batch Update Property

```typescript
import { batchUpdateProperty } from '@ifc-factory/ifc-utils';

// Update the Name property on multiple entities
const updated = batchUpdateProperty(model, [id1, id2, id3], 'Name', 'Updated Name');
console.log(`Updated ${updated} entities`);
```

## Full API

| Function | Description |
|----------|-------------|
| `validateModel(model)` | Validate model for common issues |
| `diffModels(a, b)` | Compare two models |
| `detectSchemaVersion(source)` | Detect IFC schema version from STEP string |
| `isIfc4x3(source)` | Check if STEP file is IFC4x3 |
| `generateIfcGuid()` | Generate IFC GUID |
| `generateMultipleGuids(count)` | Generate multiple GUIDs |
| `validateGuid(guid)` | Validate GUID format |
| `isValidIfcGuid(guid)` | Check if GUID is valid |
| `batchAssignProperties(model, assignments)` | Batch create and assign property sets |
| `batchUpdateProperty(model, ids, prop, value)` | Batch update a property on entities |
