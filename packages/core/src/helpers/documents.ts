import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createDocumentInformation(
  model: IfcModel,
  options: {
    identification: string;
    name: string;
    description?: string;
    location?: string;
    purpose?: string;
    revision?: string;
  },
): IfcGenericEntity {
  return model.create('IfcDocumentInformation', {
    Identification: options.identification,
    Name: options.name,
    Description: options.description ?? null,
    Location: options.location ?? null,
    Purpose: options.purpose ?? null,
    Revision: options.revision ?? null,
  });
}

export function createDocumentReference(
  model: IfcModel,
  options: {
    location?: string;
    identification?: string;
    name?: string;
    referencedDocument?: number;
  },
): IfcGenericEntity {
  return model.create('IfcDocumentReference', {
    Location: options.location ?? null,
    Identification: options.identification ?? null,
    Name: options.name ?? null,
    ReferencedDocument: options.referencedDocument ?? null,
  });
}

export function associateDocument(
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
