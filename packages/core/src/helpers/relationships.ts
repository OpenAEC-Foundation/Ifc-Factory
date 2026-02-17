import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createRelAggregates(
  model: IfcModel,
  parentId: number,
  childIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelAggregates', {
    GlobalId: generateIfcGuid(),
    RelatingObject: parentId,
    RelatedObjects: childIds,
  });
}

export function createRelAssociatesMaterial(
  model: IfcModel,
  materialId: number,
  elementIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelAssociatesMaterial', {
    GlobalId: generateIfcGuid(),
    RelatedObjects: elementIds,
    RelatingMaterial: materialId,
  });
}

export function createRelAssociatesClassification(
  model: IfcModel,
  classificationRefId: number,
  elementIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelAssociatesClassification', {
    GlobalId: generateIfcGuid(),
    RelatedObjects: elementIds,
    RelatingClassification: classificationRefId,
  });
}

export function createRelAssociatesDocument(
  model: IfcModel,
  documentRefId: number,
  elementIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelAssociatesDocument', {
    GlobalId: generateIfcGuid(),
    RelatedObjects: elementIds,
    RelatingDocument: documentRefId,
  });
}

export function createRelAssociatesLibrary(
  model: IfcModel,
  libraryRefId: number,
  elementIds: number[],
): IfcGenericEntity {
  return model.create('IfcRelAssociatesLibrary', {
    GlobalId: generateIfcGuid(),
    RelatedObjects: elementIds,
    RelatingLibrary: libraryRefId,
  });
}
