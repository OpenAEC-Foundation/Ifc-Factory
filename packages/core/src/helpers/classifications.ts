import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createClassification(
  model: IfcModel,
  options: {
    source?: string;
    edition?: string;
    name: string;
    description?: string;
    location?: string;
  },
): IfcGenericEntity {
  return model.create('IfcClassification', {
    Source: options.source ?? null,
    Edition: options.edition ?? null,
    Name: options.name,
    Description: options.description ?? null,
    Location: options.location ?? null,
  });
}

export function createClassificationReference(
  model: IfcModel,
  options: {
    location?: string;
    identification?: string;
    name?: string;
    referencedSource?: number;
  },
): IfcGenericEntity {
  return model.create('IfcClassificationReference', {
    Location: options.location ?? null,
    Identification: options.identification ?? null,
    Name: options.name ?? null,
    ReferencedSource: options.referencedSource ?? null,
  });
}

export function associateClassification(
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
