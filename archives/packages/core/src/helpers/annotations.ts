import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';

export function createAnnotation(
  model: IfcModel,
  options: {
    name?: string;
    description?: string;
    objectPlacement?: number;
    representation?: number;
  },
): IfcGenericEntity {
  return model.create('IfcAnnotation', {
    GlobalId: generateIfcGuid(),
    Name: options.name ?? null,
    Description: options.description ?? null,
    ObjectPlacement: options.objectPlacement ?? null,
    Representation: options.representation ?? null,
  });
}

export function createTextLiteral(
  model: IfcModel,
  text: string,
  placement?: number,
  path?: string,
): IfcGenericEntity {
  return model.create('IfcTextLiteral', {
    Literal: text,
    Placement: placement ?? null,
    Path: path ?? 'RIGHT',
  });
}
