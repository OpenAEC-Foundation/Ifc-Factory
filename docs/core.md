# @ifc-factory/core

Layer 3 package. The main library providing `IfcModel`, entity management, spatial structure, property sets, document management, and Dutch compliance helpers.

## Installation

```bash
pnpm add @ifc-factory/core @ifc-factory/schema
```

## IfcModel

The central class for working with IFC data.

### Construction

```typescript
import { IfcModel } from '@ifc-factory/core';

// Create empty model
const model = new IfcModel();

// Parse from STEP string
const model = IfcModel.fromStep(stepSource);

// Serialize to STEP
const output = model.toStep();
```

### Entity Operations

```typescript
// Get entity by ID
const entity = model.get(42);

// Create a new entity
const wall = model.create('IfcWall', {
  GlobalId: generateIfcGuid(),
  Name: 'My Wall',
});

// Update entity
model.update(42, { Name: 'Updated Name' });

// Delete entity
model.delete(42);

// Get all entities of a type
const walls = model.getAllOfType('IfcWall');

// Model info
console.log(model.size);     // entity count
console.log(model.schema);   // 'IFC4X3'
console.log(model.project);  // IfcProject entity
```

## Spatial Structure

### Create a Spatial Hierarchy

```typescript
import { createSpatialStructure } from '@ifc-factory/core';

const { project, site, building, storeys } = createSpatialStructure(model, {
  projectName: 'My Project',
  siteName: 'Site A',
  buildingName: 'Building 1',
  storeyNames: ['Ground Floor', 'First Floor', 'Second Floor'],
});
```

### Traverse the Tree

```typescript
const tree = model.getSpatialTree();
// Returns: { entity, children: [{ entity, children: [...] }] }

// Get children of a spatial element
const floors = model.getAggregateChildren(building.expressID);

// Get elements contained in a spatial element
const elements = model.getContainedElements(storeys[0].expressID);

// Place an element in a storey
model.containInSpatialStructure(storeys[0].expressID, wall.expressID);
```

### Flatten the Tree

```typescript
import { flattenSpatialTree } from '@ifc-factory/core';

const allNodes = flattenSpatialTree(tree);
for (const node of allNodes) {
  console.log(`${node.entity.type}: ${node.entity.Name}`);
}
```

## Property Sets

### Create and Assign

```typescript
import { createPropertySet, assignPropertySet } from '@ifc-factory/core';

const pset = createPropertySet(model, 'Pset_WallCommon', [
  { name: 'IsExternal', value: true },
  { name: 'ThermalTransmittance', value: 0.25, type: 'IFCREAL' },
  { name: 'FireRating', value: 'REI60' },
  { name: 'LoadBearing', value: false },
]);

assignPropertySet(model, pset.expressID, [wall1.expressID, wall2.expressID]);
```

### Query Property Sets

```typescript
import { getPropertySets } from '@ifc-factory/core';

const psets = getPropertySets(model, wall.expressID);
for (const pset of psets) {
  console.log(`${pset.Name}:`);
  for (const prop of pset.HasProperties ?? []) {
    const propEntity = model.get(prop);
    console.log(`  ${propEntity.Name} = ${propEntity.NominalValue}`);
  }
}
```

### Quantity Sets

```typescript
import { createQuantitySet } from '@ifc-factory/core';

const qset = createQuantitySet(model, 'Qto_WallBaseQuantities', [
  { name: 'Length', value: 5.0, quantityType: 'LENGTH' },
  { name: 'Height', value: 3.0, quantityType: 'LENGTH' },
  { name: 'NetArea', value: 15.0, quantityType: 'AREA' },
  { name: 'NetVolume', value: 3.0, quantityType: 'VOLUME' },
]);
```

## Documents

```typescript
import { createDocumentInformation, associateDocument } from '@ifc-factory/core';

const doc = createDocumentInformation(model, {
  name: 'Fire Safety Report',
  description: 'Annual fire safety inspection report',
  location: 'https://docs.example.com/fire-report-2024.pdf',
});

associateDocument(model, doc.expressID, [building.expressID]);
```

## Libraries

```typescript
import { createLibraryInformation, associateLibrary } from '@ifc-factory/core';

const lib = createLibraryInformation(model, {
  name: 'NL-SfB',
  version: '2005',
  description: 'Dutch classification system',
});

associateLibrary(model, lib.expressID, [wall.expressID]);
```

## Classifications

```typescript
import { createClassification, createClassificationReference, associateClassification } from '@ifc-factory/core';

const classification = createClassification(model, {
  name: 'NL-SfB',
  edition: '2005',
  source: 'BIM Loket',
});

const ref = createClassificationReference(model, {
  identification: '21.22',
  name: 'Buitenwanden',
  classificationId: classification.expressID,
});

associateClassification(model, ref.expressID, [wall.expressID]);
```

## 2D Annotations

```typescript
import { createAnnotation, createTextLiteral } from '@ifc-factory/core';

const annotation = createAnnotation(model, {
  name: 'Room Label',
});

const text = createTextLiteral(model, {
  literal: 'Living Room',
  placement: { x: 5.0, y: 3.0 },
});
```

## Query Builder

```typescript
import { QueryBuilder, byType, byProperty, and } from '@ifc-factory/core';

// Fluent API
const results = new QueryBuilder(model)
  .ofType('IfcWall')
  .whereProperty('Name', 'Exterior Wall')
  .limit(10)
  .execute();

// First match
const first = new QueryBuilder(model)
  .ofType('IfcDoor')
  .first();

// Count
const count = new QueryBuilder(model)
  .ofType('IfcWindow')
  .count();

// Composable filters
const filter = and(
  byType('IfcWall'),
  byProperty('Name', 'Exterior Wall')
);
```

## GUID Generation

```typescript
import { generateIfcGuid } from '@ifc-factory/core';

const guid = generateIfcGuid();
// e.g. '2TGt$H0E5Cexq0Fmv1x7tP' (22-char IFC base64)
```

## Full API Summary

| Function | Description |
|----------|-------------|
| `IfcModel.fromStep(source)` | Parse STEP string to model |
| `model.toStep()` | Serialize model to STEP |
| `model.get(id)` | Get entity by expressID |
| `model.create(type, attrs)` | Create new entity |
| `model.update(id, changes)` | Update entity attributes |
| `model.delete(id)` | Delete entity |
| `model.getAllOfType(type)` | Get all entities of a type |
| `model.getSpatialTree()` | Get spatial hierarchy tree |
| `createSpatialStructure()` | Build project/site/building/storeys |
| `createPropertySet()` | Create IfcPropertySet |
| `createQuantitySet()` | Create IfcElementQuantity |
| `assignPropertySet()` | Assign pset to elements |
| `getPropertySets()` | Get psets for an element |
| `createDocumentInformation()` | Create document |
| `associateDocument()` | Associate document to elements |
| `createLibraryInformation()` | Create library |
| `associateLibrary()` | Associate library to elements |
| `createClassification()` | Create classification |
| `associateClassification()` | Associate classification ref |
| `createAnnotation()` | Create 2D annotation |
| `createTextLiteral()` | Create text literal |
| `generateIfcGuid()` | Generate IFC GUID |
| `QueryBuilder` | Fluent query API |
