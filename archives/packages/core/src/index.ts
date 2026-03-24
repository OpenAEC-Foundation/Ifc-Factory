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

// Numbering
export {
  assignNumbers,
  removeNumbers,
  findDuplicateNumbers,
} from './helpers/numbering.js';
export type {
  NumberingSettings,
  NumberingResult,
  NumberingSystem,
  SaveTarget,
  LocationMode,
} from './helpers/numbering.js';

// Geometry
export {
  createCartesianPoint,
  createDirection,
  createAxis2Placement3D,
  createAxis2Placement2D,
  createLocalPlacement,
  createExtrudedAreaSolid,
  createShapeRepresentation,
  createProductDefinitionShape,
  getOrCreateGeometricRepresentationContext,
} from './helpers/geometry.js';

// Profiles
export {
  createRectangleProfile,
  createCircleProfile,
  createHollowRectangleProfile,
  createHollowCircleProfile,
  createIProfile,
  createAsymmetricIProfile,
  createLProfile,
  createTProfile,
  createUProfile,
  createCProfile,
  createZProfile,
  createArbitraryProfile,
  createArbitraryProfileWithVoids,
  createSteelProfile,
} from './helpers/profiles.js';
export { STEEL_PROFILES } from './data/steel-profiles.js';
export type { SteelProfileData, SteelProfileType } from './data/steel-profiles.js';

// Elements
export {
  createGrid,
  createWall,
  createWallOpening,
  createPile,
  createColumn,
  createBeam,
  createFrameMember,
} from './helpers/elements.js';
export type { GridAxisDef } from './helpers/elements.js';

// Geotechnical
export {
  createCPT,
  importGefFile,
  importGefData,
  importBroFile,
  importBroData,
  importCPT,
} from './helpers/geotechnical.js';
export type { CPTInput, CPTChannel, CPTResult } from './helpers/geotechnical.js';
export { parseGef, GEF_QUANTITY } from './helpers/gef-parser.js';
export type { GefData, GefColumnInfo, GefMeasurementText, GefMeasurementVar } from './helpers/gef-parser.js';
export { parseBroXml } from './helpers/bro-parser.js';
export type { BROCPTData, BROColumnDef } from './helpers/bro-parser.js';

// Compliance
export { createBBLPropertySet } from './compliance/bbl.js';
export { createBENGPropertySet } from './compliance/beng.js';
export { createAeriusPropertySet } from './compliance/aerius.js';

// Query
export { QueryBuilder } from './query/query-builder.js';
export { byType, byProperty, byPropertyExists, and, or, not } from './query/filters.js';
export type { EntityPredicate } from './query/filters.js';
