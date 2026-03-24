export { generateMultipleGuids, validateGuid, generateIfcGuid, isValidIfcGuid } from './guid.js';
export { validateModel } from './validation.js';
export type { ValidationIssue } from './validation.js';
export { diffModels } from './diff.js';
export type { ModelDiff } from './diff.js';
export { detectSchemaVersion, isIfc4x3 } from './schema-version.js';
export type { IfcSchemaVersion } from './schema-version.js';
export { batchAssignProperties, batchUpdateProperty } from './batch.js';
