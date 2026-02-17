// Model
export { IfcModel } from './model/ifc-model.js';
export type { SpatialTreeNode } from './model/ifc-model.js';
export { EntityStore } from './model/entity-store.js';
export { IdManager } from './model/id-manager.js';
export { RelationshipIndex } from './model/relationship-index.js';

// GUID
export { generateIfcGuid, isValidIfcGuid } from './guid/ifc-guid.js';

// IO
export { readIfcFile } from './io/reader.js';
export { writeIfcFile } from './io/writer.js';

// Helpers
export { createSpatialStructure, flattenSpatialTree } from './helpers/spatial.js';
export {
  createRelAggregates,
  createRelAssociatesMaterial,
  createRelAssociatesClassification,
  createRelAssociatesDocument,
  createRelAssociatesLibrary,
} from './helpers/relationships.js';
export {
  createPropertySet,
  createQuantitySet,
  assignPropertySet,
  getPropertySets,
} from './helpers/properties.js';
export type { PropertyValue } from './helpers/properties.js';
export {
  createDocumentInformation,
  createDocumentReference,
  associateDocument,
} from './helpers/documents.js';
export {
  createLibraryInformation,
  createLibraryReference,
  associateLibrary,
} from './helpers/libraries.js';
export {
  createClassification,
  createClassificationReference,
  associateClassification,
} from './helpers/classifications.js';
export { createAnnotation, createTextLiteral } from './helpers/annotations.js';

// Compliance
export { createBBLPropertySet } from './compliance/bbl.js';
export { createBENGPropertySet } from './compliance/beng.js';
export { createAeriusPropertySet } from './compliance/aerius.js';

// Query
export { QueryBuilder } from './query/query-builder.js';
export { byType, byProperty, byPropertyExists, and, or, not } from './query/filters.js';
export type { EntityPredicate } from './query/filters.js';
