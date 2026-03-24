# Architecture

## Package Layers

Ifc-Factory is structured as a layered monorepo. Each package has well-defined responsibilities and dependencies.

```
Layer 0:  express-parser    step-serializer
              │
Layer 1:   codegen
              │
Layer 2:   schema          step-parser
              │                 │
Layer 3:          core
                    │
Layer 4:        ifc-utils
```

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

## Two-Pass Parsing

IFC STEP files are parsed in two passes:

### Pass 1: Raw STEP Parsing (step-serializer)

The `step-serializer` package tokenizes and parses the ISO 10303-21 physical file format without any schema knowledge:

1. **Tokenizer** scans characters into tokens (strings, numbers, entity refs, enums, etc.)
2. **Reader** parses the HEADER section (FILE_DESCRIPTION, FILE_NAME, FILE_SCHEMA) and DATA section
3. Output: `StepFile` with `Map<number, StepEntityInstance>` — raw records of type name + attribute arrays

### Pass 2: Typed Entity Construction (step-parser)

The `step-parser` uses schema metadata to construct typed entities:

1. For each `StepEntityInstance`, look up the entity type in `SCHEMA_METADATA`
2. Map raw `StepValue[]` attributes to named properties using the flat `allAttributes` array
3. Resolve `#N` entity references to integer expressIDs
4. Output: `Map<number, IfcGenericEntity>` with typed attributes

## Entity Storage

### Map + Type Index

```
Entity Store:
  entities: Map<number, IfcGenericEntity>    // O(1) lookup by ID
  typeIndex: Map<string, Set<number>>        // O(1) lookup by type
```

- **Primary store** is `Map<number, IfcGenericEntity>` keyed by `expressID`
- **Secondary index** maps entity type names to sets of IDs for fast `getAllOfType()` queries
- Both are updated incrementally on create/update/delete

### Entity References

Entity references are stored as plain `number` values (expressIDs), not object references:

```typescript
// Stored as:
{ type: 'IfcRelAggregates', RelatingObject: 42, RelatedObjects: [43, 44, 45] }

// NOT as:
{ type: 'IfcRelAggregates', RelatingObject: { type: 'IfcBuilding', ... }, ... }
```

**Benefits:**
- No circular reference issues
- Easy JSON serialization
- Straightforward STEP output
- Lower memory footprint

### Relationship Index

A pre-built inverted index accelerates relationship traversal:

| Index | Maps | Use Case |
|-------|------|----------|
| `containedIn` | spatialId → elementIds | Get elements in a storey |
| `aggregatedIn` | parentId → childIds | Get children of a spatial element |
| `definedByProperties` | elementId → psetRelIds | Get property sets for an element |

The index is eagerly rebuilt when a model is loaded, and incrementally updated on mutation.

## Generated Code Strategy

### Interfaces, Not Classes

Entity types are generated as TypeScript interfaces:

```typescript
export interface IfcWall extends IfcBuildingElement {
  // inherited: expressID, type, GlobalId, Name, ...
}
```

**Why interfaces?**
- No circular import issues (interfaces are erased at runtime)
- Lighter output — no class boilerplate
- Compatible with plain object construction

### Type Discrimination

Root entities declare `readonly type: string`, which child entities inherit:

```typescript
export interface IfcRoot {
  readonly type: string;
  expressID: number;
  GlobalId: string;
  // ...
}

export interface IfcWall extends IfcBuildingElement {
  // type is inherited from IfcRoot — no redeclaration
}
```

### Schema Metadata

Runtime metadata provides attribute ordering and inheritance info needed for STEP parsing:

```typescript
SCHEMA_METADATA['IfcWall'] = {
  parent: 'IfcBuildingElement',
  abstract: false,
  allAttributes: [
    { name: 'GlobalId', type: 'string', optional: false },
    { name: 'OwnerHistory', type: 'ref', optional: true },
    // ... all inherited + own attributes in order
  ]
};
```

## Design Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Entity storage | `Map<number, IfcGenericEntity>` + type index | O(1) lookup, fast type queries |
| Entity references | Stored as `number` (expressID) | No circular refs, easy serialization |
| Relationship indexes | Eager rebuild at load, incremental on mutation | Fast spatial traversal |
| Generated code | Interfaces, not classes | No circular import issues |
| Schema metadata | Runtime object with allAttributes per entity | STEP parser needs flat ordered attribute list |
| Type discriminant | `type: string` on root entities | Compatible inheritance hierarchy |
| GUID generation | `crypto.randomUUID()` + IFC base64 | Node.js 20+ built-in |
| Delete cascade | Off by default, opt-in | Safe: geometry can be shared |
