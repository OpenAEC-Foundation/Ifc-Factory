import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createLibraryInformation(
  model: IfcModel,
  options: {
    name: string;
    version?: string;
    publisher?: number;
    description?: string;
    location?: string;
  },
): IfcGenericEntity {
  return model.create('IfcLibraryInformation', {
    Name: options.name,
    Version: options.version ?? null,
    Publisher: options.publisher ?? null,
    Description: options.description ?? null,
    Location: options.location ?? null,
  });
}

export function createLibraryReference(
  model: IfcModel,
  options: {
    location?: string;
    identification?: string;
    name?: string;
    referencedLibrary?: number;
  },
): IfcGenericEntity {
  return model.create('IfcLibraryReference', {
    Location: options.location ?? null,
    Identification: options.identification ?? null,
    Name: options.name ?? null,
    ReferencedLibrary: options.referencedLibrary ?? null,
  });
}

export function associateLibrary(
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
