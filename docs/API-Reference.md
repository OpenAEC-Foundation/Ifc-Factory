# API Reference

This page provides a consolidated view of the main APIs across all Ifc-Factory packages.

## IfcModel (core)

The central class for all IFC operations.

### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `IfcModel.fromStep(source: string)` | `IfcModel` | Parse a STEP file string |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get(id: number)` | `IfcGenericEntity \| undefined` | Get entity by expressID |
| `create(typeName: string, attrs: object)` | `IfcGenericEntity` | Create a new entity |
| `update(id: number, changes: object)` | `void` | Update entity attributes |
| `delete(id: number)` | `void` | Delete an entity |
| `getAllOfType(typeName: string)` | `IfcGenericEntity[]` | Get all entities of a type |
| `toStep()` | `string` | Serialize to STEP format |
| `getSpatialTree()` | `SpatialTreeNode` | Get the spatial hierarchy |
| `getAggregateChildren(parentId: number)` | `IfcGenericEntity[]` | Get aggregate children |
| `getContainedElements(spatialId: number)` | `IfcGenericEntity[]` | Get contained elements |
| `containInSpatialStructure(spatialId: number, elementId: number)` | `void` | Place element in spatial structure |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `project` | `IfcProject \| undefined` | The IfcProject entity |
| `size` | `number` | Total entity count |
| `schema` | `string` | Schema identifier |

## Spatial Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createSpatialStructure(model, options)` | `{ project, site, building, storeys }` | Create full spatial hierarchy |
| `flattenSpatialTree(tree)` | `SpatialTreeNode[]` | Flatten tree to array |

### SpatialStructureOptions

```typescript
interface SpatialStructureOptions {
  projectName: string;
  siteName: string;
  buildingName: string;
  storeyNames: string[];
}
```

## Property Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createPropertySet(model, name, properties)` | `IfcGenericEntity` | Create property set |
| `createQuantitySet(model, name, quantities)` | `IfcGenericEntity` | Create quantity set |
| `assignPropertySet(model, psetId, elementIds)` | `IfcGenericEntity` | Assign pset to elements |
| `getPropertySets(model, elementId)` | `IfcGenericEntity[]` | Get psets for element |

### PropertyValue

```typescript
interface PropertyValue {
  name: string;
  value: string | number | boolean;
  type?: string;   // e.g. 'IFCREAL', 'IFCLABEL'
}
```

## Document Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createDocumentInformation(model, options)` | `IfcGenericEntity` | Create document info |
| `createDocumentReference(model, options)` | `IfcGenericEntity` | Create document reference |
| `associateDocument(model, docId, elementIds)` | `IfcGenericEntity` | Associate document |

## Library Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createLibraryInformation(model, options)` | `IfcGenericEntity` | Create library info |
| `createLibraryReference(model, options)` | `IfcGenericEntity` | Create library reference |
| `associateLibrary(model, libId, elementIds)` | `IfcGenericEntity` | Associate library |

## Classification Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createClassification(model, options)` | `IfcGenericEntity` | Create classification |
| `createClassificationReference(model, options)` | `IfcGenericEntity` | Create classification ref |
| `associateClassification(model, refId, elementIds)` | `IfcGenericEntity` | Associate classification |

## Annotation Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createAnnotation(model, options)` | `IfcGenericEntity` | Create 2D annotation |
| `createTextLiteral(model, options)` | `IfcGenericEntity` | Create text literal |

## Relationship Helpers (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `createRelAggregates(model, parentId, childIds)` | `IfcGenericEntity` | Create aggregation |
| `createRelAssociatesMaterial(model, materialId, elementIds)` | `IfcGenericEntity` | Associate material |
| `createRelAssociatesClassification(model, refId, elementIds)` | `IfcGenericEntity` | Associate classification |
| `createRelAssociatesDocument(model, docId, elementIds)` | `IfcGenericEntity` | Associate document |
| `createRelAssociatesLibrary(model, libId, elementIds)` | `IfcGenericEntity` | Associate library |

## Query Builder (core)

```typescript
new QueryBuilder(model)
  .ofType('IfcWall')                           // filter by type
  .where(entity => entity.Name !== null)       // custom predicate
  .whereProperty('Name', 'Exterior Wall')      // filter by property value
  .limit(10)                                   // max results
  .execute()                                   // returns IfcGenericEntity[]
  .first()                                     // returns first match or undefined
  .count()                                     // returns number
```

### Composable Filters

```typescript
import { byType, byProperty, byPropertyExists, and, or, not } from '@ifc-factory/core';

const filter = and(
  byType('IfcWall'),
  or(
    byProperty('Name', 'Exterior'),
    byProperty('Name', 'Interior')
  ),
  not(byPropertyExists('Description'))
);
```

## GUID (core)

| Function | Returns | Description |
|----------|---------|-------------|
| `generateIfcGuid()` | `string` | Generate 22-char IFC GUID |

## Dutch Compliance (core)

See [[Dutch Compliance]] for detailed API documentation.

## Utilities (ifc-utils)

| Function | Returns | Description |
|----------|---------|-------------|
| `validateModel(model)` | `ValidationIssue[]` | Validate model |
| `diffModels(a, b)` | `ModelDiff` | Compare two models |
| `detectSchemaVersion(source)` | `IfcSchemaVersion` | Detect schema version |
| `isIfc4x3(source)` | `boolean` | Check if IFC4x3 |
| `generateMultipleGuids(count)` | `string[]` | Generate multiple GUIDs |
| `validateGuid(guid)` | `ValidationIssue[]` | Validate GUID format |
| `isValidIfcGuid(guid)` | `boolean` | Check GUID validity |
| `batchAssignProperties(model, assignments)` | `void` | Batch property assignment |
| `batchUpdateProperty(model, ids, prop, value)` | `number` | Batch property update |

## Low-Level (step-serializer)

| Function | Returns | Description |
|----------|---------|-------------|
| `readStepFile(source)` | `StepFile` | Parse raw STEP file |
| `writeStepFile(stepFile)` | `string` | Write raw STEP file |

## Low-Level (express-parser)

| Function | Returns | Description |
|----------|---------|-------------|
| `parseExpress(source)` | `SchemaNode` | Parse EXPRESS schema |
| `tokenize(source)` | `Token[]` | Tokenize EXPRESS source |
